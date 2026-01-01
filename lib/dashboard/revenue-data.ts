import { db } from "@/lib/db/client";
import {
  paymentTransaction,
  payout,
} from "@/lib/db/schema";
import { eq, and, gte, desc, sql } from "drizzle-orm";
import { formatCurrency } from "@/lib/utils/currency";

export interface RevenueMetrics {
  totalRevenue: number; // in paise
  thisMonthRevenue: number; // in paise
  thisWeekRevenue: number; // in paise
  pendingPayoutAmount: number; // in paise
}

export interface RecentTransaction {
  id: string;
  type: string;
  amount: number; // in paise
  status: string;
  createdAt: Date;
  formattedAmount: string;
}

/**
 * Get revenue metrics for a creator
 */
export async function getRevenueMetrics(
  creatorId: string
): Promise<RevenueMetrics> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)

  // Get all completed transactions
  const completedTransactions = await db
    .select({
      amount: paymentTransaction.creatorAmount,
      createdAt: paymentTransaction.createdAt,
    })
    .from(paymentTransaction)
    .where(
      and(
        eq(paymentTransaction.creatorId, creatorId),
        eq(paymentTransaction.status, "completed")
      )
    );

  // Calculate totals
  const totalRevenue = completedTransactions.reduce(
    (sum, t) => sum + Number(t.amount),
    0
  );

  const thisMonthRevenue = completedTransactions
    .filter((t) => new Date(t.createdAt) >= startOfMonth)
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const thisWeekRevenue = completedTransactions
    .filter((t) => new Date(t.createdAt) >= startOfWeek)
    .reduce((sum, t) => sum + Number(t.amount), 0);

  // Get pending payout amount
  const pendingPayouts = await db
    .select({
      netAmount: payout.netAmount,
    })
    .from(payout)
    .where(
      and(
        eq(payout.creatorId, creatorId),
        eq(payout.status, "pending")
      )
    );

  const pendingPayoutAmount = pendingPayouts.reduce(
    (sum, p) => sum + Number(p.netAmount),
    0
  );

  return {
    totalRevenue,
    thisMonthRevenue,
    thisWeekRevenue,
    pendingPayoutAmount,
  };
}

/**
 * Get pending payout amount for a creator
 */
export async function getPendingPayouts(creatorId: string): Promise<number> {
  const pendingPayouts = await db
    .select({
      netAmount: payout.netAmount,
    })
    .from(payout)
    .where(
      and(
        eq(payout.creatorId, creatorId),
        eq(payout.status, "pending")
      )
    );

  return pendingPayouts.reduce((sum, p) => sum + Number(p.netAmount), 0);
}

/**
 * Get recent transactions for a creator
 */
export async function getRecentTransactions(
  creatorId: string,
  limit: number = 10
): Promise<RecentTransaction[]> {
  const transactions = await db
    .select({
      id: paymentTransaction.id,
      type: paymentTransaction.type,
      amount: paymentTransaction.creatorAmount,
      status: paymentTransaction.status,
      createdAt: paymentTransaction.createdAt,
    })
    .from(paymentTransaction)
    .where(eq(paymentTransaction.creatorId, creatorId))
    .orderBy(desc(paymentTransaction.createdAt))
    .limit(limit);

  return transactions.map((t) => ({
    id: t.id,
    type: t.type,
    amount: Number(t.amount),
    status: t.status,
    createdAt: t.createdAt,
    formattedAmount: formatCurrency(Number(t.amount)),
  }));
}

/**
 * Get revenue data for chart (grouped by date)
 * Returns data for the last 30 days
 */
export async function getRevenueChartData(creatorId: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const transactions = await db
    .select({
      date: sql<string>`DATE(${paymentTransaction.createdAt})`,
      amount: sql<number>`SUM(${paymentTransaction.creatorAmount})`,
    })
    .from(paymentTransaction)
    .where(
      and(
        eq(paymentTransaction.creatorId, creatorId),
        eq(paymentTransaction.status, "completed"),
        gte(paymentTransaction.createdAt, thirtyDaysAgo)
      )
    )
    .groupBy(sql`DATE(${paymentTransaction.createdAt})`)
    .orderBy(sql`DATE(${paymentTransaction.createdAt})`);

  // Fill in missing dates with 0
  const chartData: { date: string; revenue: number }[] = [];
  const dateMap = new Map(
    transactions.map((t) => [t.date, Number(t.amount)])
  );

  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    chartData.push({
      date: dateStr,
      revenue: dateMap.get(dateStr) || 0,
    });
  }

  return chartData;
}

