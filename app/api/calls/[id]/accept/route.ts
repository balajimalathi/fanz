import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { call, user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateAccessToken } from "@/lib/livekit/token";
import { env } from "@/env";
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
        { error: "Forbidden: You can only accept calls intended for you" },
        { status: 403 }
      );
    }

    // Check if call is in a valid state to be accepted
    if (callRecord.status !== "ringing" && callRecord.status !== "initiated") {
      return NextResponse.json(
        { error: `Call cannot be accepted. Current status: ${callRecord.status}` },
        { status: 400 }
      );
    }

    // Get user name for participant
    const userRecord = await db.query.user.findFirst({
      where: (u, { eq: eqOp }) => eqOp(u.id, userId),
    });

    const participantName = userRecord?.name || session.user.email || "Unknown";

    // Update call status to accepted
    await db
      .update(call)
      .set({
        status: "accepted",
        startedAt: new Date(),
      })
      .where(eq(call.id, callId));

    // Generate LiveKit token for receiver
    const token = await generateAccessToken({
      roomName: callRecord.livekitRoomName || callRecord.conversationId || "",
      participantIdentity: userId,
      participantName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    // Publish call_accepted event to Redis for caller
    const callEvent = {
      type: "call_accepted" as const,
      callId: callRecord.id,
      conversationId: callRecord.conversationId || undefined,
      callerId: callRecord.callerId,
      receiverId: callRecord.receiverId,
      callType: callRecord.callType as "audio" | "video",
      status: "accepted",
      timestamp: Date.now(),
    };

    await publishCallEvent(callRecord.callerId, callEvent);

    return NextResponse.json({
      call: {
        id: callRecord.id,
        status: "accepted",
      },
      token,
      url: env.NEXT_PUBLIC_LIVEKIT_URL,
      roomName: callRecord.livekitRoomName || callRecord.conversationId,
    });
  } catch (error) {
    console.error("Error accepting call:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

