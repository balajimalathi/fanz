import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { liveStream } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ creatorId: string }> }
) {
  try {
    const { creatorId } = await params;

    // Find active stream for this creator
    const activeStream = await db.query.liveStream.findFirst({
      where: (ls, { eq: eqOp, and: andOp }) =>
        andOp(
          eqOp(ls.creatorId, creatorId),
          eqOp(ls.status, "active")
        ),
    });

    if (!activeStream) {
      return NextResponse.json({ stream: null });
    }

    return NextResponse.json({
      stream: {
        id: activeStream.id,
        creatorId: activeStream.creatorId,
        livekitRoomName: activeStream.livekitRoomName,
        streamType: activeStream.streamType,
        price: activeStream.price ? activeStream.price / 100 : null, // Convert from paise to rupees
        status: activeStream.status,
        startedAt: activeStream.startedAt,
      },
    });
  } catch (error) {
    console.error("Error fetching active stream:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
