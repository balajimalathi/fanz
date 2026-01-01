import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { call } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { publishCallEvent } from "@/lib/utils/redis-pubsub";

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

    const { id: callId } = await params;
    const userId = session.user.id;

    // Get call record
    const callRecord = await db.query.call.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, callId),
    });

    if (!callRecord) {
      return NextResponse.json(
        { error: "Call not found" },
        { status: 404 }
      );
    }

    // Verify user is the receiver
    if (callRecord.receiverId !== userId) {
      return NextResponse.json(
        { error: "Forbidden: You can only reject calls intended for you" },
        { status: 403 }
      );
    }

    // Check if call is in a valid state to be rejected
    if (callRecord.status !== "ringing" && callRecord.status !== "initiated") {
      return NextResponse.json(
        { error: `Call cannot be rejected. Current status: ${callRecord.status}` },
        { status: 400 }
      );
    }

    // Update call status to rejected
    await db
      .update(call)
      .set({
        status: "rejected",
        endedAt: new Date(),
      })
      .where(eq(call.id, callId));

    // Publish call_rejected event to Redis for caller
    const callEvent = {
      type: "call_rejected" as const,
      callId: callRecord.id,
      conversationId: callRecord.conversationId || undefined,
      callerId: callRecord.callerId,
      receiverId: callRecord.receiverId,
      callType: callRecord.callType as "audio" | "video",
      status: "rejected",
      timestamp: Date.now(),
    };

    await publishCallEvent(callRecord.callerId, callEvent);

    return NextResponse.json({
      success: true,
      call: {
        id: callRecord.id,
        status: "rejected",
      },
    });
  } catch (error) {
    console.error("Error rejecting call:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

