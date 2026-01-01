import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { liveStream, liveStreamPurchase, follower, user } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { generateAccessToken } from "@/lib/livekit/token";
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

    // Validate stream is active
    if (stream.status !== "active") {
      return NextResponse.json(
        { error: "Stream is not active" },
        { status: 400 }
      );
    }

    // Check access based on stream type
    if (stream.streamType === "free") {
      // Free streams: Allow all authenticated users
    } else if (stream.streamType === "follower_only") {
      // Check if user is a follower
      const followRecord = await db.query.follower.findFirst({
        where: (f, { eq: eqOp, and: andOp }) =>
          andOp(
            eqOp(f.followerId, session.user.id),
            eqOp(f.creatorId, stream.creatorId)
          ),
      });

      if (!followRecord) {
        return NextResponse.json(
          { error: "You must follow this creator to join the stream" },
          { status: 403 }
        );
      }
    } else if (stream.streamType === "paid") {
      // Check if user has purchased access
      const purchase = await db.query.liveStreamPurchase.findFirst({
        where: (lsp, { eq: eqOp, and: andOp }) =>
          andOp(
            eqOp(lsp.userId, session.user.id),
            eqOp(lsp.liveStreamId, streamId)
          ),
      });

      if (!purchase) {
        return NextResponse.json(
          { 
            error: "Payment required",
            requiresPayment: true,
            streamId: stream.id,
            price: stream.price ? stream.price / 100 : null,
          },
          { status: 402 }
        );
      }
    }

    // Get user name for participant
    const userRecord = await db.query.user.findFirst({
      where: (u, { eq: eqOp }) => eqOp(u.id, session.user.id),
    });

    const participantName = userRecord?.name || session.user.email || "Viewer";

    // Generate LiveKit token for viewer (canPublish: false, canSubscribe: true)
    const token = await generateAccessToken({
      roomName: stream.livekitRoomName,
      participantIdentity: session.user.id,
      participantName,
      canPublish: false, // Viewers cannot publish
      canSubscribe: true,
      canPublishData: false,
    });

    return NextResponse.json({
      token,
      url: env.NEXT_PUBLIC_LIVEKIT_URL,
      roomName: stream.livekitRoomName,
    });
  } catch (error) {
    console.error("Error joining live stream:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
