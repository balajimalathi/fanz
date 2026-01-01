import { db } from "@/lib/db/client";
import {
  conversation,
  chatMessage,
  serviceOrder,
  call,
  postLike,
  postComment,
  follower,
  subscriptions,
  post,
  user,
} from "@/lib/db/schema";
import { eq, and, desc, count, sql, or, gte, inArray } from "drizzle-orm";

export interface EngagementMetrics {
  activeConversations: number;
  unreadMessages: number;
  pendingServiceOrders: number;
  recentCalls: number;
}

export interface RecentActivity {
  id: string;
  type: "follower" | "subscriber" | "like" | "comment" | "service_order" | "call";
  message: string;
  createdAt: Date;
  userId?: string;
  userName?: string;
}

/**
 * Get engagement metrics for a creator
 */
export async function getEngagementMetrics(
  creatorId: string
): Promise<EngagementMetrics> {
  // Get active conversations count
  const conversationsResult = await db
    .select({ count: count() })
    .from(conversation)
    .where(
      and(
        eq(conversation.creatorId, creatorId),
        eq(conversation.isEnabled, true)
      )
    );

  const activeConversations = Number(conversationsResult[0]?.count || 0);

  // Get unread messages count (messages not read by creator)
  // First get all messages for creator's conversations
  const allMessages = await db
    .select({
      senderId: chatMessage.senderId,
      readAt: chatMessage.readAt,
    })
    .from(chatMessage)
    .innerJoin(conversation, eq(chatMessage.conversationId, conversation.id))
    .where(eq(conversation.creatorId, creatorId));

  // Filter unread messages not from creator
  const unreadMessages = allMessages.filter(
    (msg) => msg.senderId !== creatorId && msg.readAt === null
  ).length;

  // Get pending service orders count
  const pendingOrdersResult = await db
    .select({ count: count() })
    .from(serviceOrder)
    .where(
      and(
        eq(serviceOrder.creatorId, creatorId),
        eq(serviceOrder.status, "pending")
      )
    );

  const pendingServiceOrders = Number(pendingOrdersResult[0]?.count || 0);

  // Get recent calls count (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentCallsResult = await db
    .select({ count: count() })
    .from(call)
    .where(
      and(
        or(
          eq(call.callerId, creatorId),
          eq(call.receiverId, creatorId)
        ),
        gte(call.createdAt, sevenDaysAgo)
      )
    );

  const recentCalls = Number(recentCallsResult[0]?.count || 0);

  return {
    activeConversations,
    unreadMessages,
    pendingServiceOrders,
    recentCalls,
  };
}

/**
 * Get recent activity feed for a creator
 */
export async function getRecentActivity(
  creatorId: string,
  limit: number = 20
): Promise<RecentActivity[]> {
  const activities: RecentActivity[] = [];

  // Get recent followers
  const recentFollowers = await db
    .select({
      id: follower.id,
      userId: follower.followerId,
      createdAt: follower.createdAt,
      userName: user.name,
    })
    .from(follower)
    .innerJoin(user, eq(follower.followerId, user.id))
    .where(eq(follower.creatorId, creatorId))
    .orderBy(desc(follower.createdAt))
    .limit(limit);

  activities.push(
    ...recentFollowers.map((f) => ({
      id: f.id,
      type: "follower" as const,
      message: `${f.userName || "Someone"} started following you`,
      createdAt: f.createdAt,
      userId: f.userId,
      userName: f.userName || undefined,
    }))
  );

  // Get recent subscribers
  const memberships = await db
    .select({ id: subscriptions.planId })
    .from(subscriptions)
    .where(eq(subscriptions.status, "active"));

  // This is a simplified version - in reality, you'd need to join with membership table
  // to filter by creatorId. For now, we'll get all active subscriptions and filter client-side
  const recentSubscriptions = await db
    .select({
      id: subscriptions.id,
      userId: subscriptions.customerId,
      createdAt: subscriptions.createdAt,
    })
    .from(subscriptions)
    .where(eq(subscriptions.status, "active"))
    .orderBy(desc(subscriptions.createdAt))
    .limit(limit);

  // Note: This is simplified - you'd need proper joins to get user names
  // For now, we'll add them as activities without user names
  activities.push(
    ...recentSubscriptions.map((s) => ({
      id: s.id,
      type: "subscriber" as const,
      message: "New subscriber joined",
      createdAt: s.createdAt,
      userId: s.userId,
    }))
  );

  // Get recent post likes
  const creatorPosts = await db
    .select({ id: post.id })
    .from(post)
    .where(eq(post.creatorId, creatorId));

  const postIds = creatorPosts.map((p) => p.id);

  if (postIds.length > 0) {
    const recentLikes = await db
      .select({
        id: postLike.id,
        userId: postLike.userId,
        createdAt: postLike.createdAt,
        userName: user.name,
      })
      .from(postLike)
      .innerJoin(user, eq(postLike.userId, user.id))
      .where(inArray(postLike.postId, postIds))
      .orderBy(desc(postLike.createdAt))
      .limit(limit);

    activities.push(
      ...recentLikes.map((l) => ({
        id: l.id,
        type: "like" as const,
        message: `${l.userName || "Someone"} liked your post`,
        createdAt: l.createdAt,
        userId: l.userId,
        userName: l.userName || undefined,
      }))
    );
  }

  // Get recent comments
  if (postIds.length > 0) {
    const recentComments = await db
      .select({
        id: postComment.id,
        userId: postComment.userId,
        createdAt: postComment.createdAt,
        userName: user.name,
      })
      .from(postComment)
      .innerJoin(user, eq(postComment.userId, user.id))
      .where(inArray(postComment.postId, postIds))
      .orderBy(desc(postComment.createdAt))
      .limit(limit);

    activities.push(
      ...recentComments.map((c) => ({
        id: c.id,
        type: "comment" as const,
        message: `${c.userName || "Someone"} commented on your post`,
        createdAt: c.createdAt,
        userId: c.userId,
        userName: c.userName || undefined,
      }))
    );
  }

  // Get recent service orders
  const recentServiceOrders = await db
    .select({
      id: serviceOrder.id,
      userId: serviceOrder.userId,
      createdAt: serviceOrder.createdAt,
      userName: user.name,
    })
    .from(serviceOrder)
    .innerJoin(user, eq(serviceOrder.userId, user.id))
    .where(eq(serviceOrder.creatorId, creatorId))
    .orderBy(desc(serviceOrder.createdAt))
    .limit(limit);

  activities.push(
    ...recentServiceOrders.map((o) => ({
      id: o.id,
      type: "service_order" as const,
      message: `${o.userName || "Someone"} placed a service order`,
      createdAt: o.createdAt,
      userId: o.userId,
      userName: o.userName || undefined,
    }))
  );

  // Get recent calls
  const recentCallsData = await db
    .select({
      id: call.id,
      callerId: call.callerId,
      receiverId: call.receiverId,
      createdAt: call.createdAt,
      callType: call.callType,
    })
    .from(call)
    .where(
      or(
        eq(call.callerId, creatorId),
        eq(call.receiverId, creatorId)
      )
    )
    .orderBy(desc(call.createdAt))
    .limit(limit);

  const recentCalls = recentCallsData.map((c) => ({
    id: c.id,
    userId: c.callerId === creatorId ? c.receiverId : c.callerId,
    createdAt: c.createdAt,
    callType: c.callType,
  }));

  // Note: Getting user names for calls would require additional joins
  activities.push(
    ...recentCalls.map((c) => ({
      id: c.id,
      type: "call" as const,
      message: `Incoming ${c.callType} call`,
      createdAt: c.createdAt,
      userId: c.userId,
    }))
  );

  // Sort by date and limit
  activities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return activities.slice(0, limit);
}

