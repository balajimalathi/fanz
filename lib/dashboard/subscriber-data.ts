import { db } from "@/lib/db/client";
import {
  subscriptions,
  follower,
  membership,
} from "@/lib/db/schema";
import { eq, and, gte, lt, sql, count } from "drizzle-orm";

export interface SubscriberMetrics {
  totalSubscribers: number;
  totalFollowers: number;
  newSubscribersThisMonth: number;
  membershipBreakdown: MembershipBreakdown[];
}

export interface MembershipBreakdown {
  membershipId: string;
  membershipTitle: string;
  subscriberCount: number;
  monthlyFee: number; // in paise
}

/**
 * Get subscriber metrics for a creator
 */
export async function getSubscriberMetrics(
  creatorId: string
): Promise<SubscriberMetrics> {
  // Get all memberships for this creator
  const memberships = await db
    .select({
      id: membership.id,
      title: membership.title,
      monthlyRecurringFee: membership.monthlyRecurringFee,
    })
    .from(membership)
    .where(
      and(
        eq(membership.creatorId, creatorId),
        eq(membership.visible, true)
      )
    );

  // Get active subscriptions count
  const activeSubscriptions = await db
    .select({
      planId: subscriptions.planId,
      createdAt: subscriptions.createdAt,
    })
    .from(subscriptions)
    .where(eq(subscriptions.status, "active"));

  // Filter subscriptions for this creator's memberships
  const membershipIds = memberships.map((m) => m.id);
  const creatorSubscriptions = activeSubscriptions.filter((sub) =>
    membershipIds.includes(sub.planId)
  );

  const totalSubscribers = creatorSubscriptions.length;

  // Get new subscribers this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const newSubscribersThisMonth = creatorSubscriptions.filter(
    (sub) => new Date(sub.createdAt) >= startOfMonth
  ).length;

  // Get membership breakdown
  const membershipBreakdown: MembershipBreakdown[] = memberships.map((mem) => {
    const subscriberCount = creatorSubscriptions.filter(
      (sub) => sub.planId === mem.id
    ).length;

    return {
      membershipId: mem.id,
      membershipTitle: mem.title,
      subscriberCount,
      monthlyFee: Number(mem.monthlyRecurringFee),
    };
  });

  // Get total followers
  const followersResult = await db
    .select({ count: count() })
    .from(follower)
    .where(eq(follower.creatorId, creatorId));

  const totalFollowers = Number(followersResult[0]?.count || 0);

  return {
    totalSubscribers,
    totalFollowers,
    newSubscribersThisMonth,
    membershipBreakdown,
  };
}

/**
 * Get follower count for a creator
 */
export async function getFollowerCount(creatorId: string): Promise<number> {
  const followersResult = await db
    .select({ count: count() })
    .from(follower)
    .where(eq(follower.creatorId, creatorId));

  return Number(followersResult[0]?.count || 0);
}

/**
 * Get membership breakdown (subscription count per membership tier)
 */
export async function getMembershipBreakdown(
  creatorId: string
): Promise<MembershipBreakdown[]> {
  const memberships = await db
    .select({
      id: membership.id,
      title: membership.title,
      monthlyRecurringFee: membership.monthlyRecurringFee,
    })
    .from(membership)
    .where(
      and(
        eq(membership.creatorId, creatorId),
        eq(membership.visible, true)
      )
    );

  const activeSubscriptions = await db
    .select({
      planId: subscriptions.planId,
    })
    .from(subscriptions)
    .where(eq(subscriptions.status, "active"));

  return memberships.map((mem) => {
    const subscriberCount = activeSubscriptions.filter(
      (sub) => sub.planId === mem.id
    ).length;

    return {
      membershipId: mem.id,
      membershipTitle: mem.title,
      subscriberCount,
      monthlyFee: Number(mem.monthlyRecurringFee),
    };
  });
}

/**
 * Get subscriber growth data for chart (grouped by date)
 * Returns data for the last 30 days
 */
export async function getSubscriberGrowthChartData(
  creatorId: string
): Promise<{ date: string; subscribers: number }[]> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Get all memberships for this creator
  const memberships = await db
    .select({
      id: membership.id,
    })
    .from(membership)
    .where(
      and(
        eq(membership.creatorId, creatorId),
        eq(membership.visible, true)
      )
    );

  const membershipIds = memberships.map((m) => m.id);

  if (membershipIds.length === 0) {
    // Return empty data if no memberships
    const chartData: { date: string; subscribers: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      chartData.push({
        date: dateStr,
        subscribers: 0,
      });
    }
    return chartData;
  }

  // Get subscriptions created in the last 30 days
  // Filter subscriptions by membership IDs
  const allSubscriptionsData = await db
    .select({
      planId: subscriptions.planId,
      createdAt: subscriptions.createdAt,
    })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.status, "active"),
        gte(subscriptions.createdAt, thirtyDaysAgo)
      )
    );

  // Filter by membership IDs in JavaScript
  const filteredSubscriptions = allSubscriptionsData.filter((sub) =>
    membershipIds.includes(sub.planId)
  );

  // Build cumulative subscriber count
  const dateMap = new Map<string, number>();
  filteredSubscriptions.forEach((sub) => {
    const dateStr = new Date(sub.createdAt).toISOString().split("T")[0];
    dateMap.set(dateStr, (dateMap.get(dateStr) || 0) + 1);
  });

  const chartData: { date: string; subscribers: number }[] = [];
  let cumulativeCount = 0;

  // Get initial subscriber count (before 30 days ago)
  const initialSubscriptions = await db
    .select({
      planId: subscriptions.planId,
    })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.status, "active"),
        lt(subscriptions.createdAt, thirtyDaysAgo)
      )
    );

  // Filter by membership IDs
  const initialFiltered = initialSubscriptions.filter((sub) =>
    membershipIds.includes(sub.planId)
  );

  cumulativeCount = initialFiltered.length;

  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    const newSubs = dateMap.get(dateStr) || 0;
    cumulativeCount += newSubs;
    chartData.push({
      date: dateStr,
      subscribers: cumulativeCount,
    });
  }

  return chartData;
}

