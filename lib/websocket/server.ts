import { WebSocket } from "ws";
import { db } from "@/lib/db/client";
import { conversation, chatMessage, call } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { WebSocketMessage, WebSocketConnection, MessageSendMessage } from "./types";
import { sendPushNotificationsToUsers } from "@/lib/push/fcm";
import { env } from "@/env";

// Store active connections by userId
const connections = new Map<string, WebSocketConnection>();

/**
 * Handle WebSocket connection
 */
export function handleConnection(userId: string, ws: WebSocket): void {
  // Close existing connection if user is already connected
  const existing = connections.get(userId);
  if (existing) {
    try {
      existing.ws.close();
    } catch (error) {
      // Ignore errors from closing old connection
    }
  }

  const connection: WebSocketConnection = {
    userId,
    ws,
    lastPing: Date.now(),
    conversations: new Set(),
  };

  connections.set(userId, connection);

  // Send welcome message
  sendMessage(ws, {
    type: "pong",
    timestamp: Date.now(),
  });

  // Handle incoming messages
  ws.on("message", async (data: Buffer) => {
    try {
      const message: WebSocketMessage = JSON.parse(data.toString());
      await handleMessage(userId, message, connection);
    } catch (error) {
      console.error("Error handling WebSocket message:", error);
      sendError(ws, "INVALID_MESSAGE", "Failed to process message");
    }
  });

  // Handle ping/pong for keepalive
  ws.on("ping", () => {
    connection.lastPing = Date.now();
    ws.pong();
  });

  // Handle close
  ws.on("close", () => {
    connections.delete(userId);
  });

  // Handle errors
      ws.on("error", (error: Error) => {
        console.error(`WebSocket error for user ${userId}:`, error);
        connections.delete(userId);
      });

  // Periodic ping to check connection health
  const pingInterval = setInterval(() => {
    if (connection.ws.readyState === WebSocket.OPEN) {
      sendMessage(connection.ws, {
        type: "ping",
        timestamp: Date.now(),
      });

      // Check if last pong was recent (within 60 seconds)
      if (Date.now() - connection.lastPing > 60000) {
        connection.ws.close();
        clearInterval(pingInterval);
      }
    } else {
      clearInterval(pingInterval);
      connections.delete(userId);
    }
  }, 30000); // Ping every 30 seconds
}

/**
 * Handle incoming WebSocket messages
 */
async function handleMessage(
  userId: string,
  message: WebSocketMessage,
  connection: WebSocketConnection
): Promise<void> {
  switch (message.type) {
    case "message:send":
      await handleMessageSend(userId, message as MessageSendMessage, connection);
      break;

    case "message:read":
      await handleMessageRead(userId, message);
      break;

    case "typing:start":
      await handleTypingStart(userId, message);
      break;

    case "typing:stop":
      await handleTypingStop(userId, message);
      break;

    case "pong":
      connection.lastPing = Date.now();
      break;

    default:
      sendError(connection.ws, "UNKNOWN_MESSAGE_TYPE", `Unknown message type: ${message.type}`);
  }
}

/**
 * Handle sending a message
 */
async function handleMessageSend(
  senderId: string,
  message: MessageSendMessage,
  connection: WebSocketConnection
): Promise<void> {
  try {
    const { conversationId, messageType, content, mediaUrl, thumbnailUrl } = message.payload;

    // Verify conversation exists and user is part of it
    const conv = await db.query.conversation.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, conversationId),
    });

    if (!conv) {
      sendError(connection.ws, "CONVERSATION_NOT_FOUND", "Conversation not found");
      return;
    }

    if (conv.creatorId !== senderId && conv.fanId !== senderId) {
      sendError(connection.ws, "UNAUTHORIZED", "You are not part of this conversation");
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

    // Send to sender (confirmation)
    sendMessage(connection.ws, {
      type: "message:received",
      timestamp: Date.now(),
      messageId: newMessage.id,
      payload: {
        messageId: newMessage.id,
        conversationId,
      },
    });

    // Send to receiver
    const receiverId = conv.creatorId === senderId ? conv.fanId : conv.creatorId;
    const receiverConnection = connections.get(receiverId);

    if (receiverConnection && receiverConnection.ws.readyState === WebSocket.OPEN) {
      sendMessage(receiverConnection.ws, {
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
      });
    } else {
      // Send push notification if receiver is offline
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
    sendError(connection.ws, "SEND_FAILED", "Failed to send message");
  }
}

/**
 * Handle marking message as read
 */
async function handleMessageRead(userId: string, message: WebSocketMessage): Promise<void> {
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
      const senderConnection = connections.get(msg.senderId);
      if (senderConnection && senderConnection.ws.readyState === WebSocket.OPEN) {
        sendMessage(senderConnection.ws, message);
      }
    }
  } catch (error) {
    console.error("Error handling message read:", error);
  }
}

/**
 * Handle typing start
 */
async function handleTypingStart(userId: string, message: WebSocketMessage): Promise<void> {
  try {
    if (message.type !== "typing:start") return;

    const { conversationId } = message.payload;

    // Get conversation to find receiver
    const conv = await db.query.conversation.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, conversationId),
    });

    if (!conv) return;

    const receiverId = conv.creatorId === userId ? conv.fanId : conv.creatorId;
    const receiverConnection = connections.get(receiverId);

    if (receiverConnection && receiverConnection.ws.readyState === WebSocket.OPEN) {
      sendMessage(receiverConnection.ws, {
        type: "typing:start",
        timestamp: Date.now(),
        payload: {
          conversationId,
          userId,
        },
      });
    }
  } catch (error) {
    console.error("Error handling typing start:", error);
  }
}

/**
 * Handle typing stop
 */
async function handleTypingStop(userId: string, message: WebSocketMessage): Promise<void> {
  try {
    if (message.type !== "typing:stop") return;

    const { conversationId } = message.payload;

    // Get conversation to find receiver
    const conv = await db.query.conversation.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, conversationId),
    });

    if (!conv) return;

    const receiverId = conv.creatorId === userId ? conv.fanId : conv.creatorId;
    const receiverConnection = connections.get(receiverId);

    if (receiverConnection && receiverConnection.ws.readyState === WebSocket.OPEN) {
      sendMessage(receiverConnection.ws, {
        type: "typing:stop",
        timestamp: Date.now(),
        payload: {
          conversationId,
          userId,
        },
      });
    }
  } catch (error) {
    console.error("Error handling typing stop:", error);
  }
}

/**
 * Send WebSocket message
 */
export function sendMessage(ws: WebSocket, message: WebSocketMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

/**
 * Send error message
 */
function sendError(ws: WebSocket, code: string, message: string): void {
  sendMessage(ws, {
    type: "error",
    timestamp: Date.now(),
    payload: {
      code,
      message,
    },
  });
}

/**
 * Send message to user by ID
 */
export function sendToUser(userId: string, message: WebSocketMessage): boolean {
  const connection = connections.get(userId);
  if (connection && connection.ws.readyState === WebSocket.OPEN) {
    sendMessage(connection.ws, message);
    return true;
  }
  return false;
}

/**
 * Get connection count
 */
export function getConnectionCount(): number {
  return connections.size;
}

/**
 * Close all connections
 */
export function closeAllConnections(): void {
  for (const [userId, connection] of connections.entries()) {
    try {
      connection.ws.close();
    } catch (error) {
      // Ignore errors
    }
  }
  connections.clear();
}

