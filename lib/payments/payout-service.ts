import { db } from "@/lib/db/client"
import {
  payout,
  payoutItem,
  paymentTransaction,
  creator,
  user,
} from "@/lib/db/schema"
import { eq, and, gte, lte, desc, inArray } from "drizzle-orm"

export interface CreatePayoutRequest {
  creatorId: string
  periodStart: Date
  periodEnd: Date
}

export interface PayoutResult {
  success: boolean
  payoutId?: string
  error?: string
}

/**
 * Payout Service
 * Handles manual payout processing and bank account management
 */
export class PayoutService {
  /**
   * Create a payout for a creator for a specific period
   */
  static async createPayout(request: CreatePayoutRequest): Promise<PayoutResult> {
    try {
      // Get all completed transactions for the creator in the period
      const transactions = await db
        .select()
        .from(paymentTransaction)
        .where(
          and(
            eq(paymentTransaction.creatorId, request.creatorId),
            eq(paymentTransaction.status, "completed"),
            gte(paymentTransaction.createdAt, request.periodStart),
            lte(paymentTransaction.createdAt, request.periodEnd)
          )
        )

      if (transactions.length === 0) {
        return {
          success: false,
          error: "No completed transactions found for this period",
        }
      }

      // Calculate totals
      const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0)
      const totalPlatformFee = transactions.reduce((sum, t) => sum + t.platformFee, 0)
      const netAmount = transactions.reduce((sum, t) => sum + t.creatorAmount, 0)

      // Create payout record
      const [newPayout] = await db
        .insert(payout)
        .values({
          creatorId: request.creatorId,
          periodStart: request.periodStart,
          periodEnd: request.periodEnd,
          totalAmount,
          platformFee: totalPlatformFee,
          netAmount,
          status: "pending",
        })
        .returning()

      // Create payout items
      await db.insert(payoutItem).values(
        transactions.map((t) => ({
          payoutId: newPayout.id,
          transactionId: t.id,
          amount: t.creatorAmount,
        }))
      )

      return {
        success: true,
        payoutId: newPayout.id,
      }
    } catch (error) {
      console.error("Error creating payout:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create payout",
      }
    }
  }

  /**
   * Get pending payout amount for a creator (sum of all unpaid creator amounts)
   */
  static async getPendingPayoutAmount(creatorId: string): Promise<number> {
    try {
      // Get all completed transactions that are not yet in a completed payout
      const completedTransactions = await db
        .select()
        .from(paymentTransaction)
        .where(
          and(
            eq(paymentTransaction.creatorId, creatorId),
            eq(paymentTransaction.status, "completed")
          )
        )

      // Get all payout items for completed payouts
      const completedPayouts = await db
        .select()
        .from(payout)
        .where(
          and(
            eq(payout.creatorId, creatorId),
            eq(payout.status, "completed")
          )
        )

      const completedPayoutIds = completedPayouts.map((p) => p.id)

      const paidTransactionIds = new Set<string>()
      if (completedPayoutIds.length > 0) {
        const payoutItems = await db
          .select()
          .from(payoutItem)
          .where(
            // @ts-ignore - drizzle type issue
            completedPayoutIds.length === 1
              ? eq(payoutItem.payoutId, completedPayoutIds[0])
              : // For multiple IDs, we'd need to use inArray, but for simplicity, we'll query all
                eq(payoutItem.payoutId, completedPayoutIds[0])
          )

        // Get all payout items for all completed payouts
        for (const payoutId of completedPayoutIds) {
          const items = await db
            .select()
            .from(payoutItem)
            .where(eq(payoutItem.payoutId, payoutId))
          items.forEach((item) => paidTransactionIds.add(item.transactionId))
        }
      }

      // Calculate pending amount (transactions not in completed payouts)
      const pendingAmount = completedTransactions
        .filter((t) => !paidTransactionIds.has(t.id))
        .reduce((sum, t) => sum + t.creatorAmount, 0)

      return pendingAmount
    } catch (error) {
      console.error("Error calculating pending payout:", error)
      return 0
    }
  }

  /**
   * Update payout status
   */
  static async updatePayoutStatus(
    payoutId: string,
    status: "pending" | "processing" | "completed" | "failed"
  ): Promise<boolean> {
    try {
      await db
        .update(payout)
        .set({
          status,
          processedAt: status === "completed" ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(payout.id, payoutId))

      return true
    } catch (error) {
      console.error("Error updating payout status:", error)
      return false
    }
  }

  /**
   * Get creator bank account details
   */
  static async getCreatorBankDetails(creatorId: string) {
    const creatorRecord = await db.query.creator.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, creatorId),
    })

    return creatorRecord?.bankAccountDetails || null
  }

  /**
   * Update creator bank account details
   */
  static async updateCreatorBankDetails(
    creatorId: string,
    bankDetails: {
      pan?: string
      accountNumber?: string
      ifscCode?: string
      bankName?: string
      accountHolderName?: string
      branchName?: string
      accountType?: "savings" | "current"
    }
  ): Promise<boolean> {
    try {
      const creatorRecord = await db.query.creator.findFirst({
        where: (c, { eq: eqOp }) => eqOp(c.id, creatorId),
      })

      if (!creatorRecord) {
        return false
      }

      const existingDetails = creatorRecord.bankAccountDetails || {}
      const updatedDetails = {
        ...existingDetails,
        ...bankDetails,
        verified: false, // Reset verification when details are updated
      }

      await db
        .update(creator)
        .set({
          bankAccountDetails: updatedDetails,
          updatedAt: new Date(),
        })
        .where(eq(creator.id, creatorId))

      return true
    } catch (error) {
      console.error("Error updating bank details:", error)
      return false
    }
  }

  /**
   * Request a payout for all pending transactions
   * Creates a payout from the last completed payout date (or account creation) to now
   */
  static async requestPayout(creatorId: string): Promise<PayoutResult> {
    try {
      // Get last completed payout to determine period start
      const lastCompletedPayout = await db
        .select()
        .from(payout)
        .where(
          and(
            eq(payout.creatorId, creatorId),
            eq(payout.status, "completed")
          )
        )
        .orderBy(desc(payout.processedAt))
        .limit(1)

      // Get user creation date as fallback
      const userRecord = await db.query.user.findFirst({
        where: (u, { eq: eqOp }) => eqOp(u.id, creatorId),
      })

      const periodStart = lastCompletedPayout.length > 0
        ? lastCompletedPayout[0].periodEnd
        : userRecord?.createdAt || new Date()

      const periodEnd = new Date()

      // Get all completed transactions in this period
      const allCompletedTransactions = await db
        .select()
        .from(paymentTransaction)
        .where(
          and(
            eq(paymentTransaction.creatorId, creatorId),
            eq(paymentTransaction.status, "completed"),
            gte(paymentTransaction.createdAt, periodStart),
            lte(paymentTransaction.createdAt, periodEnd)
          )
        )

      // Get all transactions already in pending/processing payouts
      const pendingPayouts = await db
        .select()
        .from(payout)
        .where(
          and(
            eq(payout.creatorId, creatorId),
            inArray(payout.status, ["pending", "processing"])
          )
        )

      const pendingPayoutIds = pendingPayouts.map((p) => p.id)
      const usedTransactionIds = new Set<string>()

      if (pendingPayoutIds.length > 0) {
        for (const payoutId of pendingPayoutIds) {
          const items = await db
            .select()
            .from(payoutItem)
            .where(eq(payoutItem.payoutId, payoutId))
          items.forEach((item) => usedTransactionIds.add(item.transactionId))
        }
      }

      // Filter out transactions already in pending/processing payouts
      const availableTransactions = allCompletedTransactions.filter(
        (t) => !usedTransactionIds.has(t.id)
      )

      if (availableTransactions.length === 0) {
        return {
          success: false,
          error: "No available transactions to include in payout",
        }
      }

      // Calculate totals
      const totalAmount = availableTransactions.reduce((sum, t) => sum + t.amount, 0)
      const totalPlatformFee = availableTransactions.reduce((sum, t) => sum + t.platformFee, 0)
      const netAmount = availableTransactions.reduce((sum, t) => sum + t.creatorAmount, 0)

      // Create payout record
      const [newPayout] = await db
        .insert(payout)
        .values({
          creatorId,
          periodStart,
          periodEnd,
          totalAmount,
          platformFee: totalPlatformFee,
          netAmount,
          status: "pending",
        })
        .returning()

      // Create payout items
      await db.insert(payoutItem).values(
        availableTransactions.map((t) => ({
          payoutId: newPayout.id,
          transactionId: t.id,
          amount: t.creatorAmount,
        }))
      )

      return {
        success: true,
        payoutId: newPayout.id,
      }
    } catch (error) {
      console.error("Error requesting payout:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to request payout",
      }
    }
  }
}

