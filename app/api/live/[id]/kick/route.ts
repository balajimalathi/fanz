import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { liveStream } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { RoomServiceClient } from "livekit-server-sdk";
import { env } from "@/env";

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

    const { id: streamId } = await params;
    const body = await request.json();
    const { participantIdentity } = body;

    if (!participantIdentity) {
      return NextResponse.json(
        { error: "participantIdentity is required" },
        { status: 400 }
      );
    }

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
        { error: "Forbidden: Only the stream creator can kick participants" },
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

    // Use LiveKit SDK to disconnect the participant
    const roomService = new RoomServiceClient(
      env.NEXT_PUBLIC_LIVEKIT_URL,
      env.LIVEKIT_API_KEY,
      env.LIVEKIT_API_SECRET
    );

    await roomService.removeParticipant(stream.livekitRoomName, participantIdentity);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error kicking participant:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
