/**
 * Database operations for messages
 */

import { db } from "./client";
import { message } from "./schema";
import { eq, desc, and } from "drizzle-orm";
import { updateConversationLastMessage, incrementCreatorUnreadCount, incrementFanUnreadCount } from "./conversations";

export type MessageType = "text" | "image" | "audio" | "video";

export interface CreateMessageInput {
  conversationId: string;
  senderId: string;
  messageType: MessageType;
  content?: string;
  mediaUrl?: string;
}

/**
 * Create a new message
 */
export async function createMessage(input: CreateMessageInput) {
  const [newMessage] = await db
    .insert(message)
    .values({
      conversationId: input.conversationId,
      senderId: input.senderId,
      messageType: input.messageType,
      content: input.content || null,
      mediaUrl: input.mediaUrl || null,
    })
    .returning();

  // Update conversation's last message timestamp
  await updateConversationLastMessage(input.conversationId);

  // Get conversation to determine who to increment unread count for
  const conv = await db.query.conversation.findFirst({
    where: (c, { eq: eqOp }) => eqOp(c.id, input.conversationId),
  });

  if (conv) {
    // Increment unread count for the other party
    if (input.senderId === conv.creatorId) {
      await incrementFanUnreadCount(input.conversationId);
    } else {
      await incrementCreatorUnreadCount(input.conversationId);
    }
  }

  return newMessage;
}

/**
 * Get message by ID
 */
export async function getMessageById(messageId: string) {
  return db.query.message.findFirst({
    where: (m, { eq: eqOp }) => eqOp(m.id, messageId),
  });
}

/**
 * Get messages for a conversation
 */
export async function getConversationMessages(
  conversationId: string,
  limit: number = 50,
  offset: number = 0
) {
  return db.query.message.findMany({
    where: (m, { eq: eqOp }) => eqOp(m.conversationId, conversationId),
    orderBy: [desc(message.createdAt)],
    limit,
    offset,
  });
}

/**
 * Delete a message
 */
export async function deleteMessage(messageId: string) {
  await db.delete(message).where(eq(message.id, messageId));
}

/**
 * Get message count for a conversation
 */
export async function getConversationMessageCount(conversationId: string) {
  const messages = await db.query.message.findMany({
    where: (m, { eq: eqOp }) => eqOp(m.conversationId, conversationId),
  });
  return messages.length;
}

