/**
 * Database operations for conversations
 */

import { db } from "./client";
import { conversation, serviceOrder } from "./schema";
import { eq, and, desc } from "drizzle-orm";

/**
 * Get or create conversation for a service order
 */
export async function getOrCreateConversation(serviceOrderId: string) {
  // First check if conversation exists
  const existing = await db.query.conversation.findFirst({
    where: (c, { eq: eqOp }) => eqOp(c.serviceOrderId, serviceOrderId),
  });

  if (existing) {
    return existing;
  }

  // Get service order to get creator and fan IDs
  const order = await db.query.serviceOrder.findFirst({
    where: (so, { eq: eqOp }) => eqOp(so.id, serviceOrderId),
  });

  if (!order) {
    throw new Error("Service order not found");
  }

  // Create new conversation
  const [newConversation] = await db
    .insert(conversation)
    .values({
      serviceOrderId,
      creatorId: order.creatorId,
      fanId: order.userId,
    })
    .returning();

  return newConversation;
}

/**
 * Get conversation by service order ID
 */
export async function getConversationByServiceOrder(serviceOrderId: string) {
  return db.query.conversation.findFirst({
    where: (c, { eq: eqOp }) => eqOp(c.serviceOrderId, serviceOrderId),
  });
}

/**
 * Get conversation by ID
 */
export async function getConversationById(conversationId: string) {
  return db.query.conversation.findFirst({
    where: (c, { eq: eqOp }) => eqOp(c.id, conversationId),
  });
}

/**
 * Get all conversations for a creator
 */
export async function getCreatorConversations(creatorId: string) {
  return db.query.conversation.findMany({
    where: (c, { eq: eqOp }) => eqOp(c.creatorId, creatorId),
    orderBy: [desc(conversation.lastMessageAt), desc(conversation.createdAt)],
  });
}

/**
 * Get all conversations for a fan
 */
export async function getFanConversations(fanId: string) {
  return db.query.conversation.findMany({
    where: (c, { eq: eqOp }) => eqOp(c.fanId, fanId),
    orderBy: [desc(conversation.lastMessageAt), desc(conversation.createdAt)],
  });
}

/**
 * Update conversation's last message timestamp
 */
export async function updateConversationLastMessage(conversationId: string) {
  await db
    .update(conversation)
    .set({
      lastMessageAt: new Date(),
    })
    .where(eq(conversation.id, conversationId));
}

/**
 * Increment unread count for creator
 */
export async function incrementCreatorUnreadCount(conversationId: string) {
  const conv = await getConversationById(conversationId);
  if (!conv) return;

  await db
    .update(conversation)
    .set({
      unreadCountCreator: conv.unreadCountCreator + 1,
    })
    .where(eq(conversation.id, conversationId));
}

/**
 * Increment unread count for fan
 */
export async function incrementFanUnreadCount(conversationId: string) {
  const conv = await getConversationById(conversationId);
  if (!conv) return;

  await db
    .update(conversation)
    .set({
      unreadCountFan: conv.unreadCountFan + 1,
    })
    .where(eq(conversation.id, conversationId));
}

/**
 * Reset unread count for creator
 */
export async function resetCreatorUnreadCount(conversationId: string) {
  await db
    .update(conversation)
    .set({
      unreadCountCreator: 0,
    })
    .where(eq(conversation.id, conversationId));
}

/**
 * Reset unread count for fan
 */
export async function resetFanUnreadCount(conversationId: string) {
  await db
    .update(conversation)
    .set({
      unreadCountFan: 0,
    })
    .where(eq(conversation.id, conversationId));
}

