import { db } from "@/lib/db/client";
import { fanWalletTransaction, coinEarnings, creator } from "@/lib/db/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { ExchangeRateService } from "./exchange-rate-service";
import { calculateSplitPayment } from "@/lib/payments/split-calculator";
import { BASE_CURRENCY } from "@/lib/currency/currency-config";

interface CoinUsage {
  purchaseTransactionId: string;
  coinsUsed: number;
  coinValueUSD: number;
  exchangeRate: number;
  creatorCurrency: string;
}

export class CoinConversionService {
  /**
   * Calculate USD value of coins using FIFO method
   * @param coinsUsed - Number of coins being used
   * @param fanId - Fan's user ID
   * @returns Array of coin usage records with purchase details
   */
  static async calculateCoinValueUSD(
    coinsUsed: number,
    fanId: string
  ): Promise<CoinUsage[]> {
    // Get all purchase transactions ordered by date (FIFO)
    const purchases = await db.query.fanWalletTransaction.findMany({
      where: (t, { eq: eqOp, and: andOp }) =>
        andOp(eqOp(t.userId, fanId), eqOp(t.type, "purchase")),
      orderBy: (t, { asc: ascOp }) => [ascOp(t.createdAt)],
    });

    if (purchases.length === 0) {
      throw new Error("No coin purchases found for user");
    }

    // Calculate remaining coins for each purchase
    const purchaseBalances: Array<{
      purchase: typeof fanWalletTransaction.$inferSelect;
      remaining: number;
    }> = [];

    for (const purchase of purchases) {
      // Get initial coins from purchase (positive amount)
      const initialCoins = purchase.amount;

      // Calculate remaining coins by checking usage transactions linked to this purchase
      const usages = await db.query.fanWalletTransaction.findMany({
        where: (t, { eq: eqOp, and: andOp }) =>
          andOp(
            eqOp(t.userId, fanId),
            eqOp(t.type, "usage"),
            eqOp(t.linkedPurchaseTransactionId, purchase.id)
          ),
      });

      const usedCoins = Math.abs(
        usages.reduce((sum, u) => sum + (u.amount || 0), 0)
      );

      const remaining = initialCoins - usedCoins;
      if (remaining > 0) {
        purchaseBalances.push({ purchase, remaining });
      }
    }

    // Use FIFO to allocate coins
    const allocations: CoinUsage[] = [];
    let remainingToAllocate = coinsUsed;

    for (const { purchase, remaining } of purchaseBalances) {
      if (remainingToAllocate <= 0) break;

      const coinsFromThisPurchase = Math.min(remaining, remainingToAllocate);

      // Get coin value and exchange rate from purchase
      const coinValueUSD = purchase.coinValueUsd
        ? parseFloat(purchase.coinValueUsd)
        : await this.calculateCoinValueFromPurchase(purchase.id);

      const exchangeRate = purchase.exchangeRate
        ? parseFloat(purchase.exchangeRate)
        : 1.0;

      const creatorCurrency =
        purchase.creatorCurrency || BASE_CURRENCY;

      allocations.push({
        purchaseTransactionId: purchase.id,
        coinsUsed: coinsFromThisPurchase,
        coinValueUSD,
        exchangeRate,
        creatorCurrency,
      });

      remainingToAllocate -= coinsFromThisPurchase;
    }

    if (remainingToAllocate > 0) {
      throw new Error(
        `Insufficient coins available. Need ${coinsUsed}, but only ${coinsUsed - remainingToAllocate} available.`
      );
    }

    return allocations;
  }

  /**
   * Calculate coin value from purchase transaction
   * @param purchaseTransactionId - ID of the fanWalletTransaction purchase
   * @returns USD value per coin
   */
  static async calculateCoinValueFromPurchase(
    purchaseTransactionId: string
  ): Promise<number> {
    const purchase = await db.query.fanWalletTransaction.findFirst({
      where: (t, { eq: eqOp }) => eqOp(t.id, purchaseTransactionId),
    });

    if (!purchase || !purchase.paymentTransactionId) {
      throw new Error("Purchase transaction not found");
    }

    // Get payment transaction to find USD value
    const paymentTransaction = await db.query.paymentTransaction.findFirst({
      where: (pt, { eq: eqOp }) => eqOp(pt.id, purchase.paymentTransactionId!),
    });

    if (!paymentTransaction) {
      throw new Error("Payment transaction not found");
    }

    // Get plan metadata to find total coins
    const planMetadata = paymentTransaction.metadata?.planMetadata as {
      totalCoins?: number;
    } | undefined;

    if (!planMetadata?.totalCoins) {
      throw new Error("Plan metadata not found in payment transaction");
    }

    // Calculate USD value per coin
    // Payment amount is in creator currency, need to convert to USD
    const usdAmount =
      paymentTransaction.convertedAmount ||
      paymentTransaction.amount ||
      0;

    // If payment was in creator currency, we need the exchange rate
    // For now, assume payment is already in USD (base currency)
    // TODO: Handle currency conversion if payment was in different currency
    const coinValueUSD = usdAmount / planMetadata.totalCoins / 100; // Convert from cents to dollars, then divide by coins

    return coinValueUSD;
  }

  /**
   * Convert USD value to creator currency
   * @param usdValue - USD value in cents (subunits)
   * @param creatorId - Creator ID
   * @param exchangeRate - Exchange rate to use (from purchase time)
   * @returns Amount in creator currency subunits
   */
  static async convertToCreatorCurrency(
    usdValue: number,
    creatorId: string,
    exchangeRate: number
  ): Promise<number> {
    // Get creator's currency
    const creatorRecord = await db.query.creator.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, creatorId),
      columns: {
        currency: true,
      },
    });

    const creatorCurrency = creatorRecord?.currency || BASE_CURRENCY;

    // If creator currency is USD, no conversion needed
    if (creatorCurrency === BASE_CURRENCY) {
      return usdValue;
    }

    // Convert using the provided exchange rate (from purchase time)
    return Math.round(usdValue * exchangeRate);
  }

  /**
   * Create coin earnings record for creator
   * @param creatorId - Creator ID
   * @param fanId - Fan ID
   * @param coinsUsed - Number of coins used
   * @param usageTransactionId - ID of the fanWalletTransaction usage record
   * @param metadata - Additional metadata (messageId, callId, streamId, etc.)
   */
  static async createCoinEarnings(
    creatorId: string,
    fanId: string,
    coinsUsed: number,
    usageTransactionId: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      // Calculate USD value using FIFO
      const allocations = await this.calculateCoinValueUSD(coinsUsed, fanId);

      // Process each allocation (in case coins come from multiple purchases)
      for (const allocation of allocations) {
        // Calculate USD value for this allocation
        const usdValueCents = Math.round(
          allocation.coinsUsed * allocation.coinValueUSD * 100
        ); // Convert to cents

        // Convert to creator currency
        const creatorAmountCents = await this.convertToCreatorCurrency(
          usdValueCents,
          creatorId,
          allocation.exchangeRate
        );

        // Apply platform fee (10%)
        const split = calculateSplitPayment(creatorAmountCents);
        const creatorAmount = split.creatorAmount;
        const platformFee = split.platformFee;

        // Get payment transaction ID from the purchase
        const purchaseTransaction = await db.query.fanWalletTransaction.findFirst(
          {
            where: (t, { eq: eqOp }) =>
              eqOp(t.id, allocation.purchaseTransactionId),
            columns: {
              paymentTransactionId: true,
            },
          }
        );

        // Create earnings record
        await db.insert(coinEarnings).values({
          creatorId,
          fanWalletTransactionId: usageTransactionId,
          coinsUsed: allocation.coinsUsed,
          usdValue: usdValueCents,
          creatorCurrency: allocation.creatorCurrency,
          creatorAmount,
          platformFee,
          exchangeRate: allocation.exchangeRate.toString(),
          paymentTransactionId: purchaseTransaction?.paymentTransactionId || null,
          metadata: metadata || {},
        });
      }
    } catch (error) {
      console.error("Error creating coin earnings:", error);
      throw error;
    }
  }
}
