import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { liveStream } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

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

    // Verify user is the creator of this stream
    if (stream.creatorId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden: Only the stream creator can end the stream" },
        { status: 403 }
      );
    }

    // Update stream status to ended
    await db
      .update(liveStream)
      .set({
        status: "ended",
        endedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(liveStream.id, streamId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error ending live stream:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
