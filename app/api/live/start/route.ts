import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { liveStream } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
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

    // Check if user has creator role
    if (session.user.role !== "creator") {
      return NextResponse.json(
        { error: "Forbidden: Creator role required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { streamType, price } = body;

    if (!streamType || !["free", "follower_only", "paid"].includes(streamType)) {
      return NextResponse.json(
        { error: "Invalid stream type. Must be 'free', 'follower_only', or 'paid'" },
        { status: 400 }
      );
    }

    // Validate price for paid streams
    if (streamType === "paid") {
      if (!price || typeof price !== "number" || price <= 0) {
        return NextResponse.json(
          { error: "Price is required for paid streams and must be greater than 0" },
          { status: 400 }
        );
      }
    }

    // Check if creator already has an active stream
    const existingStream = await db.query.liveStream.findFirst({
      where: (ls, { eq: eqOp, and: andOp }) =>
        andOp(
          eqOp(ls.creatorId, session.user.id),
          eqOp(ls.status, "active")
        ),
    });

    if (existingStream) {
      return NextResponse.json(
        { error: "You already have an active stream. Please end it before starting a new one." },
        { status: 400 }
      );
    }

    // Get creator name for participant
    const creatorRecord = await db.query.creator.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, session.user.id),
    });

    const creatorName = creatorRecord?.displayName || session.user.name || session.user.email || "Creator";

    // Generate unique room name using UUID
    const streamId = crypto.randomUUID();
    const roomName = `live_${streamId}`;

    // Create live stream record
    const [newStream] = await db
      .insert(liveStream)
      .values({
        id: streamId,
        creatorId: session.user.id,
        livekitRoomName: roomName,
        streamType: streamType as "free" | "follower_only" | "paid",
        price: streamType === "paid" ? Math.round(price * 100) : null, // Convert to paise
        status: "active",
      })
      .returning();

    // Generate LiveKit token for creator
    const token = await generateAccessToken({
      roomName,
      participantIdentity: session.user.id,
      participantName: creatorName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    return NextResponse.json({
      streamId: newStream.id,
      roomName,
      token,
      url: env.NEXT_PUBLIC_LIVEKIT_URL,
    });
  } catch (error) {
    console.error("Error starting live stream:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
