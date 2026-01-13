import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { CallMeteringService } from "@/lib/services/call-metering-service";
import { db } from "@/lib/db/client";
import { call, conversation } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: callId } = await params;
    const userId = session.user.id;

    // Get call record to find the fan (who pays)
    const callRecord = await db.query.call.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, callId),
    });

    if (!callRecord) {
      return NextResponse.json(
        { error: "Call not found" },
        { status: 404 }
      );
    }

    // Verify user is part of the call
    if (callRecord.callerId !== userId && callRecord.receiverId !== userId) {
      return NextResponse.json(
        { error: "Forbidden: You are not part of this call" },
        { status: 403 }
      );
    }

    // Get conversation to determine who is the fan (fan pays for calls)
    const conv = await db.query.conversation.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, callRecord.conversationId || ""),
    });

    if (!conv) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Only process heartbeat if metering is active (fan is paying)
    // If creator sends heartbeat, just return success without processing
    if (!callRecord.meteringActive) {
      return NextResponse.json({
        success: true,
        shouldCutoff: false,
        coinsDeducted: 0,
        remainingBalance: 0,
      });
    }

    // Only process metering for the fan (who pays)
    // If creator is sending heartbeat, just acknowledge it
    const isFan = conv.fanId === userId;
    if (!isFan) {
      // Creator heartbeat - just acknowledge, don't process metering
      return NextResponse.json({
        success: true,
        shouldCutoff: false,
        coinsDeducted: 0,
        remainingBalance: 0,
      });
    }

    // Process heartbeat for fan (who pays)
    const fanId = conv.fanId;
    const result = await CallMeteringService.processHeartbeat(callId, fanId);

    if (result.shouldCutoff) {
      return NextResponse.json(
        {
          success: false,
          shouldCutoff: true,
          message: "Insufficient balance. Call will be ended.",
          remainingBalance: result.remainingBalance,
        },
        { status: 402 } // Payment Required
      );
    }

    return NextResponse.json({
      success: result.success,
      shouldCutoff: false,
      coinsDeducted: result.coinsDeducted,
      remainingBalance: result.remainingBalance,
    });
  } catch (error) {
    console.error("Error processing call heartbeat:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
