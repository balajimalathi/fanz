import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { conversation } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateAccessToken } from "@/lib/livekit/token";
import { env } from "@/env";

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { conversationId } = body;

    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId is required" },
        { status: 400 }
      );
    }

    // Validate user has access to this conversation
    const conv = await db.query.conversation.findFirst({
      where: (c, { eq: eqOp, and: andOp }) =>
        andOp(eqOp(c.id, conversationId)),
    });

    if (!conv) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Check if user is either creator or fan
    const isCreator = conv.creatorId === session.user.id;
    const isFan = conv.fanId === session.user.id;

    if (!isCreator && !isFan) {
      return NextResponse.json(
        { error: "Forbidden: You don't have access to this conversation" },
        { status: 403 }
      );
    }

    // Get user name for participant
    const userRecord = await db.query.user.findFirst({
      where: (u, { eq: eqOp }) => eqOp(u.id, session.user.id),
    });

    const participantName = userRecord?.name || session.user.email || "Unknown";

    // Generate token
    const token = generateAccessToken({
      roomName: conversationId, // Use conversation ID as room name
      participantIdentity: session.user.id,
      participantName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    return NextResponse.json({
      token,
      url: env.NEXT_PUBLIC_LIVEKIT_URL,
      roomName: conversationId,
    });
  } catch (error) {
    console.error("Error generating LiveKit token:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

