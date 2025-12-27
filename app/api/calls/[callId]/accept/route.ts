import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { call, user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sendToUser } from "@/lib/socketio/server";
import { trackServiceOrderParticipation } from "@/lib/utils/service-orders";

// POST - Accept a call
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ callId: string }> }
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

    const { callId } = await params;
    const userId = session.user.id;

    // Get call
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
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // Determine if receiver is creator
    const receiverUser = await db.query.user.findFirst({
      where: (u, { eq: eqOp }) => eqOp(u.id, userId),
    });
    const callerUser = await db.query.user.findFirst({
      where: (u, { eq: eqOp }) => eqOp(u.id, callRecord.callerId),
    });

    const receiverIsCreator = receiverUser?.role === "creator";
    const callerIsCreator = callerUser?.role === "creator";

    // Update call status
    await db
      .update(call)
      .set({
        status: "accepted",
        startedAt: new Date(),
      })
      .where(eq(call.id, callId));

    // Track creator participation if this is a service order call
    if (callRecord.serviceOrderId && receiverIsCreator && !callerIsCreator) {
      await trackServiceOrderParticipation(callRecord.serviceOrderId, userId, true);
    }

    // Notify caller
    sendToUser(callRecord.callerId, {
      type: "call:accept",
      timestamp: Date.now(),
      messageId: callId,
      payload: {
        callId,
        livekitRoomName: callRecord.livekitRoomName || "",
        token: "", // Token should be generated separately via /api/calls/livekit/token
      },
    });

    return NextResponse.json({
      success: true,
      roomName: callRecord.livekitRoomName,
    });
  } catch (error) {
    console.error("Error accepting call:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

