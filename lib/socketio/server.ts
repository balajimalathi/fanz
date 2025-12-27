import { Server as SocketIOServer, Socket } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import createClient from "ioredis"
import { db } from "@/lib/db/client";
import { conversation, chatMessage, user, serviceOrder, service } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { WebSocketMessage, MessageSendMessage, ChatStartMessage, ChatAcceptMessage, ChatRejectMessage } from "@/lib/websocket/types";
import { sendPushNotificationsToUsers } from "@/lib/push/fcm";
import { env } from "@/env";
import { isServiceTimeExpired, trackServiceOrderParticipation } from "@/lib/utils/service-orders";

// Store user ID to socket ID mapping (for sending messages to specific users)
const userSocketMap = new Map<string, Set<string>>();

// Track last activity timestamp per user (for presence tracking)
const userLastActivityMap = new Map<string, number>();

// Track active chat start requests (serviceOrderId -> { creatorId, fanId, expiresAt, creatorAccepted, fanAccepted })
const activeChatStarts = new Map<string, {
  creatorId: string;
  fanId: string;
  conversationId: string;
  expiresAt: number;
  creatorAccepted: boolean;
  fanAccepted: boolean;
}>();

// Global Socket.IO server instance (set by standalone server)
let globalIO: SocketIOServer | null = null;

/**
 * Set the global Socket.IO server instance
 */
export function setGlobalIO(io: SocketIOServer): void {
  globalIO = io;
}

/**
 * Get the global Socket.IO server instance
 */
export function getGlobalIO(): SocketIOServer | null {
  return globalIO;
}

/**
 * Initialize Socket.IO server with Redis adapter
 */
export function initializeSocketIOServer(io: SocketIOServer): void {
  // Setup Redis adapter for horizontal scaling (Valkey compatible)
  const pubClient = new createClient({
    host: env.REDIS_HOST,
    port: parseInt(env.REDIS_PORT),
    password: env.REDIS_PASSWORD,
    db: parseInt(env.REDIS_DB),
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    lazyConnect: true,
  });

  const subClient = pubClient.duplicate();

  pubClient.on("error", (error) => {
    console.error("Redis pub client error:", error);
  });

  subClient.on("error", (error) => {
    console.error("Redis sub client error:", error);
  });

  // Connect both clients and set adapter
  Promise.all([pubClient.connect(), subClient.connect()])
    .then(() => {
      io.adapter(createAdapter(pubClient, subClient));
      console.log("Socket.IO Redis adapter initialized");
    })
    .catch((error) => {
      console.error("Failed to connect Redis adapter:", error);
      // Continue without adapter (single server mode)
      console.warn("Continuing without Redis adapter - single server mode only");
    });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      // Get auth token from handshake
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      const cookies = socket.handshake.headers.cookie;

      // Create headers for better-auth
      const headers = new Headers();
      if (cookies) {
        headers.set("cookie", cookies);
      }
      if (token) {
        headers.set("authorization", `Bearer ${token}`);
      }

      // Authenticate using better-auth
      const { auth } = await import("@/lib/auth/auth");
      const session = await auth.api.getSession({
        headers: await Promise.resolve(headers),
      });

      if (!session?.user?.id) {
        return next(new Error("Authentication failed"));
      }

      // Attach user info to socket
      socket.data.userId = session.user.id;
      socket.data.role = session.user.role || null;

      console.log(`[SOCKET.IO] Authentication successful for user ${session.user.id}`);
      next();
    } catch (error) {
      console.error("Socket authentication error:", error);
      next(new Error("Authentication failed"));
    }
  });

  // Handle connections
  io.on("connection", async (socket: Socket) => {
    const userId = socket.data.userId as string;

    // Track user socket
    const wasOffline = !userSocketMap.has(userId) || userSocketMap.get(userId)!.size === 0;
    if (!userSocketMap.has(userId)) {
      userSocketMap.set(userId, new Set());
    }
    userSocketMap.get(userId)!.add(socket.id);

    // Update last seen timestamp
    const now = Date.now();
    userLastActivityMap.set(userId, now);
    
    // Update database lastSeenAt
    try {
      await db
        .update(user)
        .set({ lastSeenAt: new Date(now) })
        .where(eq(user.id, userId));
    } catch (error) {
      console.error("Error updating lastSeenAt:", error);
    }

    // If user just came online, broadcast presence:online
    if (wasOffline) {
      broadcastPresenceChange(userId, true, io);
    }

    console.log(`[SOCKET.IO] User ${userId} connected (socket: ${socket.id})`);
    console.log(`[SOCKET.IO] Total users connected: ${userSocketMap.size}`);
    console.log(`[SOCKET.IO] User ${userId} has ${userSocketMap.get(userId)!.size} socket(s)`);

    // Send welcome message
    socket.emit("message", {
      type: "pong",
      timestamp: Date.now(),
    } as WebSocketMessage);

    // Set up heartbeat interval (ping every 30 seconds)
    const heartbeatInterval = setInterval(async () => {
      const lastActivity = userLastActivityMap.get(userId) || now;
      const timeSinceActivity = Date.now() - lastActivity;
      
      // If no activity for 60 seconds, consider user offline
      if (timeSinceActivity > 60000) {
        socket.emit("message", {
          type: "ping",
          timestamp: Date.now(),
        } as WebSocketMessage);
      } else {
        // Update last activity
        userLastActivityMap.set(userId, Date.now());
        try {
          await db.update(user)
            .set({ lastSeenAt: new Date() })
            .where(eq(user.id, userId));
        } catch (error) {
          console.error("Error updating lastSeenAt in heartbeat:", error);
        }
      }
    }, 30000); // 30 seconds

    // Store interval on socket for cleanup
    socket.data.heartbeatInterval = heartbeatInterval;

    // Handle message:send
    socket.on("message:send", async (message: MessageSendMessage) => {
      console.log(`[SOCKET.IO] Received message:send from user ${userId}:`, message);
      await handleMessageSend(userId, message, socket, io);
    });

    // Handle message:read
    socket.on("message:read", async (message: WebSocketMessage) => {
      await handleMessageRead(userId, message, io);
    });

    // Handle typing:start
    socket.on("typing:start", async (message: WebSocketMessage) => {
      await handleTypingStart(userId, message, io);
    });

    // Handle typing:stop
    socket.on("typing:stop", async (message: WebSocketMessage) => {
      await handleTypingStop(userId, message, io);
    });

    // Handle ping
    socket.on("ping", () => {
      // Update last activity on ping
      userLastActivityMap.set(userId, Date.now());
      socket.emit("message", {
        type: "pong",
        timestamp: Date.now(),
      } as WebSocketMessage);
    });

    // Handle chat:start
    socket.on("chat:start", async (message: ChatStartMessage) => {
      await handleChatStart(userId, message, io);
    });

    // Handle chat:accept
    socket.on("chat:accept", async (message: ChatAcceptMessage) => {
      await handleChatAccept(userId, message, io);
    });

    // Handle chat:reject
    socket.on("chat:reject", async (message: ChatRejectMessage) => {
      await handleChatReject(userId, message, io);
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      // Clear heartbeat interval
      if (socket.data.heartbeatInterval) {
        clearInterval(socket.data.heartbeatInterval);
      }

      const userSockets = userSocketMap.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          userSocketMap.delete(userId);
          userLastActivityMap.delete(userId);
          // User went offline, broadcast presence:offline
          broadcastPresenceChange(userId, false, io);
        }
      }
      console.log(`[SOCKET.IO] User ${userId} disconnected (socket: ${socket.id})`);
      console.log(`[SOCKET.IO] Remaining users: ${userSocketMap.size}`);
    });

    // Handle errors
    socket.on("error", (error: Error) => {
      console.error(`Socket error for user ${userId}:`, error);
    });
  });
}

/**
 * Handle sending a message
 */
async function handleMessageSend(
  senderId: string,
  message: MessageSendMessage,
  socket: Socket,
  io: SocketIOServer
): Promise<void> {
  try {
    console.log(`[SOCKET.IO] handleMessageSend called for sender ${senderId}`);
    const { conversationId, messageType, content, mediaUrl, thumbnailUrl } = message.payload;
    console.log(`[SOCKET.IO] Message payload:`, { conversationId, messageType, content: content?.substring(0, 50) });

    // Verify conversation exists and user is part of it
    const conv = await db.query.conversation.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, conversationId),
    });

    if (!conv) {
      socket.emit("message", {
        type: "error",
        timestamp: Date.now(),
        payload: {
          code: "CONVERSATION_NOT_FOUND",
          message: "Conversation not found",
        },
      } as WebSocketMessage);
      return;
    }

    if (conv.creatorId !== senderId && conv.fanId !== senderId) {
      socket.emit("message", {
        type: "error",
        timestamp: Date.now(),
        payload: {
          code: "UNAUTHORIZED",
          message: "You are not part of this conversation",
        },
      } as WebSocketMessage);
      return;
    }

    // Check payment validation: require active service order for both creator and fan
    let order = null;
    if (conv.serviceOrderId) {
      order = await db.query.serviceOrder.findFirst({
        where: (so, { eq: eqOp }) => eqOp(so.id, conv.serviceOrderId!),
      });
    }

    const senderIsCreator = conv.creatorId === senderId;

    // If there's a service order, validate it
    if (order) {
      // Check if service order is active
      if (order.status !== "active") {
        socket.emit("message", {
          type: "error",
          timestamp: Date.now(),
          payload: {
            code: "SERVICE_ORDER_NOT_ACTIVE",
            message: "Service order is not active. Please activate the service order to continue chatting.",
          },
        } as WebSocketMessage);
        return;
      }

      // Check if service time has expired
      const expired = await isServiceTimeExpired(order.id);
      if (expired) {
        socket.emit("message", {
          type: "error",
          timestamp: Date.now(),
          payload: {
            code: "SERVICE_TIME_EXPIRED",
            message: "Service time has expired. The chat session has ended.",
          },
        } as WebSocketMessage);
        return;
      }
    } else {
      // No service order - require conversation to be enabled
      if (!conv.isEnabled) {
        socket.emit("message", {
          type: "error",
          timestamp: Date.now(),
          payload: {
            code: "CONVERSATION_DISABLED",
            message: "This conversation requires an active service order. Please purchase a service to continue chatting.",
          },
        } as WebSocketMessage);
        return;
      }
    }

    // Legacy check: if conversation is enabled (unless user is creator) - kept for backward compatibility
    if (!conv.isEnabled && !senderIsCreator && !order) {
      socket.emit("message", {
        type: "error",
        timestamp: Date.now(),
        payload: {
          code: "CONVERSATION_DISABLED",
          message: "This conversation is not enabled yet. Please wait for the creator to enable it.",
        },
      } as WebSocketMessage);
      return;
    }

    // Create message in database
    const [newMessage] = await db
      .insert(chatMessage)
      .values({
        conversationId,
        senderId,
        messageType,
        content: content || null,
        mediaUrl: mediaUrl || null,
        thumbnailUrl: thumbnailUrl || null,
      })
      .returning();

    // Update conversation
    await db
      .update(conversation)
      .set({
        lastMessageAt: new Date(),
        lastMessagePreview: messageType === "text" ? (content?.substring(0, 100) || null) : `${messageType} message`,
        updatedAt: new Date(),
      })
      .where(eq(conversation.id, conversationId));

    // Track participation for service order
    if (conv.serviceOrderId) {
      try {
        await trackServiceOrderParticipation(
          conv.serviceOrderId,
          senderId,
          senderIsCreator
        );
      } catch (error) {
        console.error("[SOCKET.IO] Error tracking service order participation:", error);
        // Don't block message send if participation tracking fails
      }
    }

    // Create the message object to send
    const messageToSend: WebSocketMessage = {
      type: "message:send",
      timestamp: Date.now(),
      messageId: newMessage.id,
      payload: {
        conversationId,
        messageType: newMessage.messageType,
        content: newMessage.content || undefined,
        mediaUrl: newMessage.mediaUrl || undefined,
        thumbnailUrl: newMessage.thumbnailUrl || undefined,
      },
    };

    // Send to sender (so they see their own message immediately)
    console.log(`[SOCKET.IO] Sending message to sender ${senderId} (their own message)`);
    socket.emit("message", messageToSend);

    // Send to receiver
    const receiverId = conv.creatorId === senderId ? conv.fanId : conv.creatorId;
    console.log(`[SOCKET.IO] Sending message to receiver ${receiverId} (sender: ${senderId})`);
    console.log(`[SOCKET.IO] Conversation: creator=${conv.creatorId}, fan=${conv.fanId}`);
    console.log(`[SOCKET.IO] Available users in map:`, Array.from(userSocketMap.keys()));
    
    const sent = sendToUser(receiverId, messageToSend, io);
    
    console.log(`[SOCKET.IO] Message sent to receiver ${receiverId}:`, sent ? "SUCCESS" : "FAILED (offline)");
    
    // Also send confirmation to sender
    socket.emit("message", {
      type: "message:received",
      timestamp: Date.now(),
      messageId: newMessage.id,
      payload: {
        messageId: newMessage.id,
        conversationId,
      },
    } as WebSocketMessage);

    // Send push notification if receiver is offline
    const receiverSockets = userSocketMap.get(receiverId);
    if (!receiverSockets || receiverSockets.size === 0) {
      try {
        await sendPushNotificationsToUsers([receiverId], {
          title: "New message",
          body: messageType === "text" ? (content?.substring(0, 100) || "New message") : `${messageType} message`,
          data: {
            type: "chat_message",
            conversationId,
            messageId: newMessage.id,
          },
        });
      } catch (error) {
        console.error("Failed to send push notification:", error);
      }
    }
  } catch (error) {
    console.error("Error handling message send:", error);
    socket.emit("message", {
      type: "error",
      timestamp: Date.now(),
      payload: {
        code: "SEND_FAILED",
        message: "Failed to send message",
      },
    } as WebSocketMessage);
  }
}

/**
 * Handle marking message as read
 */
async function handleMessageRead(
  userId: string,
  message: WebSocketMessage,
  io: SocketIOServer
): Promise<void> {
  try {
    if (message.type !== "message:read") return;

    const { messageId, conversationId } = message.payload;

    // Update message read status
    await db
      .update(chatMessage)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(chatMessage.id, messageId),
          eq(chatMessage.conversationId, conversationId)
        )
      );

    // Notify sender that message was read
    const msg = await db.query.chatMessage.findFirst({
      where: (m, { eq: eqOp }) => eqOp(m.id, messageId),
    });

    if (msg && msg.senderId !== userId) {
      sendToUser(msg.senderId, message, io || undefined);
    }
  } catch (error) {
    console.error("Error handling message read:", error);
  }
}

/**
 * Handle typing start
 */
async function handleTypingStart(
  userId: string,
  message: WebSocketMessage,
  io: SocketIOServer
): Promise<void> {
  try {
    if (message.type !== "typing:start") return;

    const { conversationId } = message.payload;

    // Get conversation to find receiver
    const conv = await db.query.conversation.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, conversationId),
    });

    if (!conv) return;

    const receiverId = conv.creatorId === userId ? conv.fanId : conv.creatorId;
    sendToUser(receiverId, {
      type: "typing:start",
      timestamp: Date.now(),
      payload: {
        conversationId,
        userId,
      },
    } as WebSocketMessage, io || undefined);
  } catch (error) {
    console.error("Error handling typing start:", error);
  }
}

/**
 * Handle typing stop
 */
async function handleTypingStop(
  userId: string,
  message: WebSocketMessage,
  io: SocketIOServer
): Promise<void> {
  try {
    if (message.type !== "typing:stop") return;

    const { conversationId } = message.payload;

    // Get conversation to find receiver
    const conv = await db.query.conversation.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, conversationId),
    });

    if (!conv) return;

    const receiverId = conv.creatorId === userId ? conv.fanId : conv.creatorId;
    sendToUser(receiverId, {
      type: "typing:stop",
      timestamp: Date.now(),
      payload: {
        conversationId,
        userId,
      },
    } as WebSocketMessage, io || undefined);
  } catch (error) {
    console.error("Error handling typing stop:", error);
  }
}

/**
 * Send message to user by ID
 */
export function sendToUser(
  userId: string,
  message: WebSocketMessage,
  io?: SocketIOServer
): boolean {
  console.log(`[SOCKET.IO] sendToUser called for user ${userId}, message type: ${message.type}`);
  
  // Use provided io, or fall back to global instance
  const server = io || globalIO;
  if (!server) {
    console.warn(`[SOCKET.IO] ERROR: Socket.IO server not available, cannot send message to user: ${userId}`);
    return false;
  }
  console.log(`[SOCKET.IO] Using server instance:`, server ? "OK" : "NULL");

  const userSockets = userSocketMap.get(userId);
  console.log(`[SOCKET.IO] User ${userId} sockets:`, userSockets ? Array.from(userSockets) : "NONE");
  console.log(`[SOCKET.IO] Total users in map: ${userSocketMap.size}`);
  
  if (userSockets && userSockets.size > 0) {
    // Send to all sockets for this user (in case they have multiple tabs/devices)
    userSockets.forEach((socketId) => {
      console.log(`[SOCKET.IO] Emitting message to socket ${socketId} for user ${userId}`);
      server.to(socketId).emit("message", message);
      console.log(`[SOCKET.IO] Message emitted successfully to socket ${socketId}`);
    });
    return true;
  }
  console.log(`[SOCKET.IO] WARNING: No sockets found for user ${userId}`);
  console.log(`[SOCKET.IO] Available users:`, Array.from(userSocketMap.keys()));
  return false;
}

/**
 * Get connection count
 */
export function getConnectionCount(): number {
  return userSocketMap.size;
}

/**
 * Check if user is online
 */
export function isUserOnline(userId: string): boolean {
  const sockets = userSocketMap.get(userId);
  return sockets !== undefined && sockets.size > 0;
}

/**
 * Broadcast presence change to relevant users
 */
function broadcastPresenceChange(userId: string, isOnline: boolean, io: SocketIOServer): void {
  const message: WebSocketMessage = {
    type: isOnline ? "presence:online" : "presence:offline",
    timestamp: Date.now(),
    payload: {
      userId,
      timestamp: Date.now(),
    },
  };

  // Broadcast to all connected users (they can filter on client side)
  io.emit("message", message);
}

/**
 * Handle chat start
 */
async function handleChatStart(
  userId: string,
  message: ChatStartMessage,
  io: SocketIOServer
): Promise<void> {
  try {
    const { serviceOrderId, conversationId, creatorId, fanId, expiresAt } = message.payload;

    // Verify user is the creator
    if (userId !== creatorId) {
      return;
    }

    // Store active chat start request
    activeChatStarts.set(serviceOrderId, {
      creatorId,
      fanId,
      conversationId,
      expiresAt,
      creatorAccepted: true,
      fanAccepted: false,
    });

    // Send chat:start to fan
    sendToUser(fanId, message, io);

    // Set timeout to handle expiration
    setTimeout(() => {
      const chatStart = activeChatStarts.get(serviceOrderId);
      if (chatStart && !chatStart.fanAccepted) {
        // Timeout - notify both users
        activeChatStarts.delete(serviceOrderId);
        
        const timeoutMessage: WebSocketMessage = {
          type: "chat:timeout",
          timestamp: Date.now(),
          payload: {
            serviceOrderId,
            conversationId,
          },
        };

        sendToUser(creatorId, timeoutMessage, io);
        sendToUser(fanId, timeoutMessage, io);
      }
    }, expiresAt - Date.now());
  } catch (error) {
    console.error("Error handling chat start:", error);
  }
}

/**
 * Handle chat accept
 */
async function handleChatAccept(
  userId: string,
  message: ChatAcceptMessage,
  io: SocketIOServer
): Promise<void> {
  try {
    const { serviceOrderId, conversationId } = message.payload;
    const chatStart = activeChatStarts.get(serviceOrderId);

    if (!chatStart) {
      return;
    }

    // Update acceptance status
    if (userId === chatStart.creatorId) {
      chatStart.creatorAccepted = true;
    } else if (userId === chatStart.fanId) {
      chatStart.fanAccepted = true;
    }

    // If both accepted, enable conversation and notify both
    if (chatStart.creatorAccepted && chatStart.fanAccepted) {
      activeChatStarts.delete(serviceOrderId);

      // Enable conversation
      await db
        .update(conversation)
        .set({ isEnabled: true, updatedAt: new Date() })
        .where(eq(conversation.id, conversationId));

      // Notify both users
      const acceptMessage: WebSocketMessage = {
        type: "chat:accept",
        timestamp: Date.now(),
        payload: {
          serviceOrderId,
          conversationId,
          userId,
        },
      };

      sendToUser(chatStart.creatorId, acceptMessage, io);
      sendToUser(chatStart.fanId, acceptMessage, io);
    } else {
      // Send acceptance notification to the other party
      const otherUserId = userId === chatStart.creatorId ? chatStart.fanId : chatStart.creatorId;
      sendToUser(otherUserId, message, io);
    }
  } catch (error) {
    console.error("Error handling chat accept:", error);
  }
}

/**
 * Handle chat reject
 */
async function handleChatReject(
  userId: string,
  message: ChatRejectMessage,
  io: SocketIOServer
): Promise<void> {
  try {
    const { serviceOrderId, conversationId } = message.payload;
    const chatStart = activeChatStarts.get(serviceOrderId);

    if (!chatStart) {
      return;
    }

    // Remove active chat start
    activeChatStarts.delete(serviceOrderId);

    // Notify the other party
    const otherUserId = userId === chatStart.creatorId ? chatStart.fanId : chatStart.creatorId;
    sendToUser(otherUserId, message, io);
  } catch (error) {
    console.error("Error handling chat reject:", error);
  }
}

