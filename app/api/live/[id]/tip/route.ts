import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { liveStream, fanWalletTransaction } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { WalletService } from "@/lib/wallet/wallet-service";
import { CoinConversionService } from "@/lib/services/coin-conversion-service";
import { publishCollectionUpdate } from "@/lib/utils/redis-pubsub";
import { calculateStreamCollection } from "@/lib/services/live-stream-collection-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: streamId } = await params;
    const body = await request.json();
    const { coins } = body;

    if (!coins || typeof coins !== "number" || coins <= 0) {
      return NextResponse.json(
        { error: "Invalid coin amount. Must be a positive number." },
        { status: 400 }
      );
    }

    // Fetch stream details
    const stream = await db.query.liveStream.findFirst({
      where: (ls, { eq: eqOp }) => eqOp(ls.id, streamId),
    });

    if (!stream) {
      return NextResponse.json(
        { error: "Stream not found" },
        { status: 404 }
      );
    }

    // Verify stream is active
    if (stream.status !== "active") {
      return NextResponse.json(
        { error: "Stream is not active" },
        { status: 400 }
      );
    }

    // Check wallet balance
    const balance = await WalletService.getBalance(session.user.id);
    if (balance < coins) {
      return NextResponse.json(
        { error: "Insufficient coins. You have " + balance + " coins." },
        { status: 400 }
      );
    }

    // Deduct coins from fan's wallet
    const success = await WalletService.deductCredits(
      session.user.id,
      coins,
      `Tip to creator during live stream - ${streamId}`,
      {
        streamId,
        creatorId: stream.creatorId,
        type: "tip",
      }
    );

    if (!success) {
      return NextResponse.json(
        { error: "Failed to deduct coins" },
        { status: 500 }
      );
    }

    // Create coin earnings for creator
    // Get the transaction ID from the usage record
    const transactions = await db.query.fanWalletTransaction.findMany({
      where: (t, { eq: eqOp, and: andOp }) =>
        andOp(
          eqOp(t.userId, session.user.id),
          eqOp(t.type, "usage")
        ),
      orderBy: (t, { desc: descOp }) => [descOp(t.createdAt)],
      limit: 1,
    });

    const usageTransactionId = transactions[0]?.id;
    if (usageTransactionId) {
      await CoinConversionService.createCoinEarnings(
        stream.creatorId,
        session.user.id,
        coins,
        usageTransactionId,
        {
          streamId,
          type: "tip",
        }
      );
    }

    // Publish collection update
    if (stream.status === "active") {
      try {
        const creator = await db.query.creator.findFirst({
          where: (c, { eq: eqOp }) => eqOp(c.id, stream.creatorId),
        });
        const currency = creator?.currency || "USD";
        
        const collection = await calculateStreamCollection(streamId, currency);
        
        await publishCollectionUpdate(streamId, {
          type: "collection_update",
          streamId,
          total: collection.total,
          currency,
          entryFees: collection.entryFees,
          tips: collection.tips,
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error("Error publishing collection update for tip:", error);
        // Don't throw - graceful degradation
      }
    }

    return NextResponse.json({
      success: true,
      message: "Tip sent successfully",
    });
  } catch (error) {
    console.error("Error processing tip:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
