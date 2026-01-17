import { db } from "@/lib/db/client";
import { fanWallet, fanWalletTransaction } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export class WalletService {
  /**
   * Get or create wallet for user and return balance
   */
  static async getBalance(userId: string): Promise<number> {
    let wallet = await db.query.fanWallet.findFirst({
      where: (w, { eq: eqOp }) => eqOp(w.userId, userId),
    });

    if (!wallet) {
      // Create wallet with 0 balance
      const [newWallet] = await db
        .insert(fanWallet)
        .values({
          userId,
          balance: 0,
        })
        .returning();
      wallet = newWallet;
    }

    return wallet.balance;
  }

  /**
   * Add credits to user's wallet
   */
  static async addCredits(
    userId: string,
    amount: number,
    paymentTransactionId: string | null,
    description: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    // Get or create wallet
    let wallet = await db.query.fanWallet.findFirst({
      where: (w, { eq: eqOp }) => eqOp(w.userId, userId),
    });

    if (!wallet) {
      const [newWallet] = await db
        .insert(fanWallet)
        .values({
          userId,
          balance: 0,
        })
        .returning();
      wallet = newWallet;
    }

    // Update balance
    await db
      .update(fanWallet)
      .set({
        balance: wallet.balance + amount,
        updatedAt: new Date(),
      })
      .where(eq(fanWallet.id, wallet.id));

    // Create transaction record
    await db.insert(fanWalletTransaction).values({
      userId,
      type: "purchase",
      amount, // Positive for purchase
      description,
      paymentTransactionId: paymentTransactionId || null,
      metadata: metadata || {},
    });
  }

  /**
   * Deduct credits from user's wallet
   */
  static async deductCredits(
    userId: string,
    amount: number,
    description: string,
    metadata?: Record<string, unknown>
  ): Promise<boolean> {
    // Get wallet
    const wallet = await db.query.fanWallet.findFirst({
      where: (w, { eq: eqOp }) => eqOp(w.userId, userId),
    });

    if (!wallet) {
      throw new Error("Wallet not found");
    }

    // Check if user has sufficient balance
    if (wallet.balance < amount) {
      return false;
    }

    // Update balance
    await db
      .update(fanWallet)
      .set({
        balance: wallet.balance - amount,
        updatedAt: new Date(),
      })
      .where(eq(fanWallet.id, wallet.id));

    // Create transaction record
    await db.insert(fanWalletTransaction).values({
      userId,
      type: "usage",
      amount: -amount, // Negative for usage
      description,
      metadata: metadata || {},
    });

    return true;
  }

  /**
   * Get transaction history for user
   */
  static async getTransactions(userId: string, limit: number = 50) {
    return await db.query.fanWalletTransaction.findMany({
      where: (t, { eq: eqOp }) => eqOp(t.userId, userId),
      orderBy: (t, { desc: descOp }) => [descOp(t.createdAt)],
      limit,
    });
  }

  /**
   * Check if user has made any credit purchases before
   */
  static async hasPreviousPurchase(userId: string): Promise<boolean> {
    const purchase = await db.query.fanWalletTransaction.findFirst({
      where: (t, { eq: eqOp, and: andOp }) =>
        andOp(eqOp(t.userId, userId), eqOp(t.type, "purchase")),
    });

    return !!purchase;
  }

  /**
   * Reserve credits temporarily (for calls, etc.)
   * This deducts the credits but marks them as reserved in metadata
   */
  static async reserveCredits(
    userId: string,
    amount: number,
    description: string,
    metadata?: Record<string, unknown>
  ): Promise<boolean> {
    return await this.deductCredits(userId, amount, description, {
      ...metadata,
      reserved: true,
    });
  }

  /**
   * Release reservation by refunding credits
   */
  static async releaseReservation(
    userId: string,
    amount: number,
    description: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.addCredits(userId, amount, null, description, {
      ...metadata,
      refund: true,
    });
  }
}
