import { db } from "@/lib/db/client";
import { call } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { WalletService } from "@/lib/wallet/wallet-service";
import { CreatorPricingService } from "./creator-pricing-service";

export class CallMeteringService {
  /**
   * Initialize call metering - reserve coins and start metering
   */
  static async initializeCallMetering(
    callId: string,
    fanId: string,
    creatorId: string,
    callType: "audio" | "video"
  ): Promise<void> {
    // Get price per minute
    const pricePerMinute = await CreatorPricingService.getCallPricePerMinute(
      creatorId,
      callType
    );

    // Reserve 1 minute worth of coins
    const coinsToReserve = pricePerMinute;

    // Check balance
    const balance = await WalletService.getBalance(fanId);
    if (balance < coinsToReserve) {
      throw new Error("Insufficient balance to start call");
    }

    // Reserve coins (deduct immediately for first minute)
    const success = await WalletService.deductCredits(
      fanId,
      coinsToReserve,
      `Call ${callType} - first minute`,
      {
        callId,
        creatorId,
        callType,
        minutes: 1,
      }
    );

    if (!success) {
      throw new Error("Failed to reserve coins for call");
    }

    // Update call record
    await db
      .update(call)
      .set({
        coinsReserved: coinsToReserve,
        coinsSpent: coinsToReserve,
        lastHeartbeatAt: new Date(),
      })
      .where(eq(call.id, callId));
  }

  /**
   * Process heartbeat - deduct coins per minute, check balance
   */
  static async processHeartbeat(
    callId: string,
    fanId: string
  ): Promise<{
    success: boolean;
    shouldCutoff: boolean;
    coinsDeducted: number;
    remainingBalance: number;
  }> {
    // Get call record
    const callRecord = await db.query.call.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, callId),
    });

    if (!callRecord) {
      throw new Error("Call not found");
    }

    if (!callRecord.meteringActive) {
      return {
        success: false,
        shouldCutoff: false,
        coinsDeducted: 0,
        remainingBalance: 0,
      };
    }

    // Get conversation to find creator
    const conv = await db.query.conversation.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, callRecord.conversationId || ""),
    });

    if (!conv) {
      throw new Error("Conversation not found");
    }

    const creatorId = conv.creatorId;

    // Get price per minute
    const pricePerMinute = await CreatorPricingService.getCallPricePerMinute(
      creatorId,
      callRecord.callType as "audio" | "video"
    );

    // Calculate elapsed time since last heartbeat
    const now = new Date();
    const lastHeartbeat = callRecord.lastHeartbeatAt
      ? new Date(callRecord.lastHeartbeatAt)
      : callRecord.startedAt
      ? new Date(callRecord.startedAt)
      : now;

    const elapsedSeconds = (now.getTime() - lastHeartbeat.getTime()) / 1000;
    const elapsedMinutes = elapsedSeconds / 60;

    // If less than 30 seconds elapsed, don't charge yet
    if (elapsedSeconds < 30) {
      return {
        success: true,
        shouldCutoff: false,
        coinsDeducted: 0,
        remainingBalance: await WalletService.getBalance(fanId),
      };
    }

    // Calculate coins to deduct (proportional to elapsed time, minimum 1 minute)
    const minutesToCharge = Math.max(1, Math.ceil(elapsedMinutes));
    const coinsToDeduct = pricePerMinute * minutesToCharge;

    // Check balance
    const balance = await WalletService.getBalance(fanId);
    if (balance < coinsToDeduct) {
      // Insufficient balance - cutoff call
      await db
        .update(call)
        .set({
          meteringActive: false,
          endedAt: now,
          status: "ended",
        })
        .where(eq(call.id, callId));

      return {
        success: false,
        shouldCutoff: true,
        coinsDeducted: 0,
        remainingBalance: balance,
      };
    }

    // Deduct coins
    const success = await WalletService.deductCredits(
      fanId,
      coinsToDeduct,
      `Call ${callRecord.callType} - ${minutesToCharge} minute(s)`,
      {
        callId,
        creatorId,
        callType: callRecord.callType,
        minutes: minutesToCharge,
      }
    );

    if (!success) {
      // Failed to deduct - cutoff call
      await db
        .update(call)
        .set({
          meteringActive: false,
          endedAt: now,
          status: "ended",
        })
        .where(eq(call.id, callId));

      return {
        success: false,
        shouldCutoff: true,
        coinsDeducted: 0,
        remainingBalance: balance,
      };
    }

    // Update call record
    const newCoinsSpent = (callRecord.coinsSpent || 0) + coinsToDeduct;
    await db
      .update(call)
      .set({
        coinsSpent: newCoinsSpent,
        lastHeartbeatAt: now,
      })
      .where(eq(call.id, callId));

    const newBalance = await WalletService.getBalance(fanId);

    return {
      success: true,
      shouldCutoff: false,
      coinsDeducted: coinsToDeduct,
      remainingBalance: newBalance,
    };
  }

  /**
   * Finalize call metering - calculate final charges, refund excess
   */
  static async finalizeCallMetering(callId: string): Promise<void> {
    const callRecord = await db.query.call.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, callId),
    });

    if (!callRecord) {
      return;
    }

    // Mark metering as inactive
    await db
      .update(call)
      .set({
        meteringActive: false,
      })
      .where(eq(call.id, callId));

    // Note: We don't refund here because we charge per minute as we go
    // The coinsReserved was just the initial charge, and coinsSpent tracks total
  }

  /**
   * Check balance and end call if insufficient
   */
  static async checkAndCutoffCall(
    callId: string,
    fanId: string
  ): Promise<boolean> {
    const result = await this.processHeartbeat(callId, fanId);
    return result.shouldCutoff;
  }
}
