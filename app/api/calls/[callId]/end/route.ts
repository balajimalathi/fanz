import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { call } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { sendToUser } from "@/lib/websocket/server";
import { z } from "zod";

const endCallSchema = z.object({
  duration: z.number().optional(),
});

// POST - End a call
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

    // Verify user is part of the call
    if (callRecord.callerId !== userId && callRecord.receiverId !== userId) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const validationResult = endCallSchema.safeParse(body);
    const duration = validationResult.success ? validationResult.data.duration : undefined;

    // Calculate duration if started
    let finalDuration = duration;
    if (!finalDuration && callRecord.startedAt) {
      const now = new Date();
      finalDuration = Math.floor(
        (now.getTime() - callRecord.startedAt.getTime()) / 1000
      );
    }

    // Update call status
    await db
      .update(call)
      .set({
        status: "ended",
        endedAt: new Date(),
        duration: finalDuration || null,
      })
      .where(eq(call.id, callId));

    // Notify other participant
    const otherUserId =
      callRecord.callerId === userId
        ? callRecord.receiverId
        : callRecord.callerId;

    sendToUser(otherUserId, {
      type: "call:end",
      timestamp: Date.now(),
      messageId: callId,
      payload: {
        callId,
        duration: finalDuration,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error ending call:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

