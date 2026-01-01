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

    // Verify user is either caller or receiver
    if (callRecord.callerId !== userId && callRecord.receiverId !== userId) {
      return NextResponse.json(
        { error: "Forbidden: You don't have permission to end this call" },
        { status: 403 }
      );
    }

    // Check if call is in a valid state to be ended
    if (callRecord.status !== "accepted" && callRecord.status !== "ringing") {
      return NextResponse.json(
        { error: `Call cannot be ended. Current status: ${callRecord.status}` },
        { status: 400 }
      );
    }

    // Calculate duration if call was accepted
    let duration: number | null = null;
    if (callRecord.status === "accepted" && callRecord.startedAt) {
      const endTime = new Date();
      duration = Math.floor((endTime.getTime() - callRecord.startedAt.getTime()) / 1000); // Duration in seconds
    }

    // Update call status to ended
    await db
      .update(call)
      .set({
        status: "ended",
        endedAt: new Date(),
        duration,
      })
      .where(eq(call.id, callId));

    // Determine the other participant
    const otherParticipantId = callRecord.callerId === userId 
      ? callRecord.receiverId 
      : callRecord.callerId;

    // Publish call_ended event to Redis for the other participant
    const callEvent = {
      type: "call_ended" as const,
      callId: callRecord.id,
      conversationId: callRecord.conversationId || undefined,
      callerId: callRecord.callerId,
      receiverId: callRecord.receiverId,
      callType: callRecord.callType as "audio" | "video",
      status: "ended",
      timestamp: Date.now(),
    };

    await publishCallEvent(otherParticipantId, callEvent);

    return NextResponse.json({
      success: true,
      call: {
        id: callRecord.id,
        status: "ended",
        duration,
      },
    });
  } catch (error) {
    console.error("Error ending call:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

