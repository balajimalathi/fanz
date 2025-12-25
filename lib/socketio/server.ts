import { Server as SocketIOServer, Socket } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "ioredis";
import { db } from "@/lib/db/client";
import { conversation, chatMessage } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { WebSocketMessage, MessageSendMessage } from "@/lib/websocket/types";
import { sendPushNotificationsToUsers } from "@/lib/push/fcm";
import { env } from "@/env";

// Store user ID to socket ID mapping (for sending messages to specific users)
const userSocketMap = new Map<string, Set<string>>();

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
  const pubClient = createClient({
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
  io.on("connection", (socket: Socket) => {
    const userId = socket.data.userId as string;

    // Track user socket
    if (!userSocketMap.has(userId)) {
      userSocketMap.set(userId, new Set());
    }
    userSocketMap.get(userId)!.add(socket.id);

    console.log(`[SOCKET.IO] User ${userId} connected (socket: ${socket.id})`);
    console.log(`[SOCKET.IO] Total users connected: ${userSocketMap.size}`);
    console.log(`[SOCKET.IO] User ${userId} has ${userSocketMap.get(userId)!.size} socket(s)`);

    // Send welcome message
    socket.emit("message", {
      type: "pong",
      timestamp: Date.now(),
    } as WebSocketMessage);

    // Handle message:send
    socket.on("message:send", async (message: MessageSendMessage) => {
      console.log(`[SOCKET.IO] Received message:send from user ${userId}:`, message);
      await handleMessageSend(userId, message, socket);
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
      socket.emit("message", {
        type: "pong",
        timestamp: Date.now(),
      } as WebSocketMessage);
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      const userSockets = userSocketMap.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          userSocketMap.delete(userId);
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
  socket: Socket
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

    // Check if conversation is enabled (unless user is creator)
    if (!conv.isEnabled && conv.creatorId !== senderId) {
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
    
    const sent = sendToUser(receiverId, messageToSend, socket.server);
    
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

