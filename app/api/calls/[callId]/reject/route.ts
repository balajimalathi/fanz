import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { call } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sendToUser } from "@/lib/socketio/server";

// POST - Reject a call
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

    // Update call status
    await db
      .update(call)
      .set({
        status: "rejected",
        endedAt: new Date(),
      })
      .where(eq(call.id, callId));

    // Notify caller
    sendToUser(callRecord.callerId, {
      type: "call:reject",
      timestamp: Date.now(),
      messageId: callId,
      payload: {
        callId,
        reason: "Call rejected",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error rejecting call:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

