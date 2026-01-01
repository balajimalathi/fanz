import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { liveStream } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateAccessToken } from "@/lib/livekit/token";
import { env } from "@/env";

export async function GET(
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

    // Verify user is the creator of this stream
    if (stream.creatorId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden: Only the stream creator can access this" },
        { status: 403 }
      );
    }

    // Verify stream is active
    if (stream.status !== "active") {
      return NextResponse.json(
        { error: "Stream is not active" },
        { status: 400 }
      );
    }

    // Get creator name for participant
    const creatorRecord = await db.query.creator.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, stream.creatorId),
    });

    const creatorName = creatorRecord?.displayName || session.user.name || session.user.email || "Creator";

    // Generate LiveKit token for creator (canPublish: true, canSubscribe: true)
    const token = await generateAccessToken({
      roomName: stream.livekitRoomName,
      participantIdentity: session.user.id,
      participantName: creatorName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    return NextResponse.json({
      token,
      url: env.NEXT_PUBLIC_LIVEKIT_URL,
      roomName: stream.livekitRoomName,
    });
  } catch (error) {
    console.error("Error getting stream token:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
