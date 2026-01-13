import { db } from "@/lib/db/client";
import { chatMessage, conversation } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { WalletService } from "@/lib/wallet/wallet-service";

export class DMChargeService {
  /**
   * Get all messages with pending charges in a conversation
   */
  static async getPendingCharges(conversationId: string) {
    return await db.query.chatMessage.findMany({
      where: (m, { eq: eqOp, and: andOp }) =>
        andOp(
          eqOp(m.conversationId, conversationId),
          eqOp(m.coinsDeducted, false),
          // coinsPending > 0
        ),
      orderBy: (m, { asc: ascOp }) => [ascOp(m.createdAt)],
    });
  }

  /**
   * Process all pending DM charges when creator replies
   */
  static async processPendingCharges(
    conversationId: string,
    creatorId: string
  ): Promise<{
    processed: number;
    failed: number;
    totalDeducted: number;
  }> {
    // Get conversation to find fan ID
    const conv = await db.query.conversation.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, conversationId),
    });

    if (!conv) {
      throw new Error("Conversation not found");
    }

    // Get all pending messages (from fan, not creator)
    const pendingMessages = await db.query.chatMessage.findMany({
      where: (m, { eq: eqOp, and: andOp }) =>
        andOp(
          eqOp(m.conversationId, conversationId),
          eqOp(m.senderId, conv.fanId), // Only fan messages
          eqOp(m.coinsDeducted, false)
        ),
      orderBy: (m, { asc: ascOp }) => [ascOp(m.createdAt)],
    });

    let processed = 0;
    let failed = 0;
    let totalDeducted = 0;

    for (const message of pendingMessages) {
      // Skip if no pending coins
      if (!message.coinsPending || message.coinsPending <= 0) {
        continue;
      }

      try {
        // Check if fan has sufficient balance
        const balance = await WalletService.getBalance(conv.fanId);
        if (balance < message.coinsPending) {
          // Insufficient balance - log but don't block
          console.error(
            `Insufficient balance for message ${message.id}. Required: ${message.coinsPending}, Available: ${balance}`
          );
          failed++;
          continue;
        }

        // Deduct coins
        const success = await WalletService.deductCredits(
          conv.fanId,
          message.coinsPending,
          `DM ${message.messageType} message to creator`,
          {
            messageId: message.id,
            conversationId,
            creatorId,
            messageType: message.messageType,
          }
        );

        if (success) {
          // Mark as deducted
          await db
            .update(chatMessage)
            .set({
              coinsDeducted: true,
              deductedAt: new Date(),
              coinsPending: null,
            })
            .where(eq(chatMessage.id, message.id));

          processed++;
          totalDeducted += message.coinsPending;
        } else {
          failed++;
        }
      } catch (error) {
        console.error(`Error processing charge for message ${message.id}:`, error);
        failed++;
      }
    }

    return { processed, failed, totalDeducted };
  }

  /**
   * Mark charges as deducted (for manual processing if needed)
   */
  static async markChargesAsDeducted(
    messageIds: string[],
    transactionIds?: string[]
  ): Promise<void> {
    for (let i = 0; i < messageIds.length; i++) {
      const messageId = messageIds[i];
      const transactionId = transactionIds?.[i];

      await db
        .update(chatMessage)
        .set({
          coinsDeducted: true,
          deductedAt: new Date(),
          coinsPending: null,
        })
        .where(eq(chatMessage.id, messageId));
    }
  }
}
