import { db } from "@/lib/db/client";
import { liveStream, liveStreamPurchase, paymentTransaction, fanWalletTransaction, coinEarnings } from "@/lib/db/schema";
import { eq, and, gte, or, isNull } from "drizzle-orm";
import { sql } from "drizzle-orm";

/**
 * Calculate total collection for a live stream
 * @param streamId - The stream ID
 * @param currency - Currency code (default: USD)
 * @returns Collection breakdown (total, entryFees, tips)
 */
export async function calculateStreamCollection(
  streamId: string,
  currency: string = "USD"
): Promise<{
  total: number;
  entryFees: number;
  tips: number;
}> {
  // Get stream details
  const stream = await db.query.liveStream.findFirst({
    where: (ls, { eq: eqOp }) => eqOp(ls.id, streamId),
  });

  if (!stream) {
    return { total: 0, entryFees: 0, tips: 0 };
  }

  // Calculate entry fees from payment transactions
  const entryFeesPaid = await db
    .select({
      total: sql<number>`COALESCE(SUM(${paymentTransaction.amount}), 0)`,
    })
    .from(liveStreamPurchase)
    .innerJoin(
      paymentTransaction,
      eq(liveStreamPurchase.paymentTransactionId, paymentTransaction.id)
    )
    .where(
      and(
        eq(liveStreamPurchase.liveStreamId, streamId),
        eq(paymentTransaction.status, "completed"),
        eq(paymentTransaction.type, "live_stream")
      )
    );

  const entryFeesFromPayments = entryFeesPaid[0]?.total || 0;

  // For coin-based entries, we'll use the stream price
  // Note: This is a simplification - in reality, you'd need to track coin values
  const coinBasedEntries = await db
    .select({
      count: sql<number>`COUNT(*)`,
    })
    .from(liveStreamPurchase)
    .where(
      and(
        eq(liveStreamPurchase.liveStreamId, streamId),
        isNull(liveStreamPurchase.paymentTransactionId)
      )
    );

  const coinEntryCount = coinBasedEntries[0]?.count || 0;
  const coinEntryFees = (stream.price || 0) * coinEntryCount; // stream.price is in paise

  const entryFees = (entryFeesFromPayments + coinEntryFees) / 100; // Convert from paise/cents to main currency

  // Calculate tips from payment transactions (wallet_credit payments)
  const tipsFromPayments = await db
    .select({
      total: sql<number>`COALESCE(SUM(${paymentTransaction.amount}), 0)`,
    })
    .from(paymentTransaction)
    .where(
      and(
        eq(paymentTransaction.creatorId, stream.creatorId),
        eq(paymentTransaction.type, "wallet_credit"),
        eq(paymentTransaction.status, "completed"),
        gte(paymentTransaction.createdAt, stream.startedAt),
        or(
          isNull(stream.endedAt),
          sql`${paymentTransaction.createdAt} <= ${stream.endedAt}`
        ),
        // Check if tip has streamId in metadata (indicating it's a tip during this stream)
        sql`${paymentTransaction.metadata}->>'streamId' = ${streamId}`
      )
    );

  const tipsFromPaymentsAmount = (tipsFromPayments[0]?.total || 0) / 100; // Convert from paise/cents to main currency

  // Calculate tips from coin-based transactions (fanWalletTransaction with type="usage" and metadata.streamId)
  // Note: We need to convert coins to currency value - for now, we'll use a simple conversion
  // In a real system, you'd calculate the USD value of coins using FIFO from coin purchases
  const tipsFromCoins = await db
    .select({
      total: sql<number>`COALESCE(SUM(ABS(${fanWalletTransaction.amount})), 0)`,
    })
    .from(fanWalletTransaction)
    .where(
      and(
        eq(fanWalletTransaction.type, "usage"),
        gte(fanWalletTransaction.createdAt, stream.startedAt),
        or(
          isNull(stream.endedAt),
          sql`${fanWalletTransaction.createdAt} <= ${stream.endedAt}`
        ),
        // Check if transaction has streamId and type="tip" in metadata
        sql`${fanWalletTransaction.metadata}->>'streamId' = ${streamId}`,
        sql`${fanWalletTransaction.metadata}->>'type' = 'tip'`
      )
    );

  // Get USD value of coin tips from coinEarnings table
  // Join with fanWalletTransaction to get the timestamp
  const coinEarningsTips = await db
    .select({
      total: sql<number>`COALESCE(SUM(${coinEarnings.usdValue}), 0)`,
    })
    .from(coinEarnings)
    .innerJoin(
      fanWalletTransaction,
      eq(coinEarnings.fanWalletTransactionId, fanWalletTransaction.id)
    )
    .where(
      and(
        eq(coinEarnings.creatorId, stream.creatorId),
        gte(fanWalletTransaction.createdAt, stream.startedAt),
        or(
          isNull(stream.endedAt),
          sql`${fanWalletTransaction.createdAt} <= ${stream.endedAt}`
        ),
        // Check if earnings have streamId and type="tip" in metadata
        sql`${coinEarnings.metadata}->>'streamId' = ${streamId}`,
        sql`${coinEarnings.metadata}->>'type' = 'tip'`
      )
    );

  const tipsFromCoinsUSD = (coinEarningsTips[0]?.total || 0) / 100; // Convert from cents to currency

  // Total tips = payment tips + coin tips (converted to currency)
  const tips = tipsFromPaymentsAmount + tipsFromCoinsUSD;

  const total = entryFees + tips;

  return { total, entryFees, tips };
}
