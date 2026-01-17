import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { CreatorOnlineStatusService } from "@/lib/services/creator-online-status-service";
import { db } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { creator } from "@/lib/db/schema";

// GET - Check if specific creator is online (by username)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { username } = await params;

    // Resolve username to creatorId
    const creatorRecord = await db.query.creator.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.username, username.toLowerCase()),
      columns: {
        id: true,
      },
    });

    if (!creatorRecord) {
      return NextResponse.json(
        { error: "Creator not found" },
        { status: 404 }
      );
    }

    const isOnline = await CreatorOnlineStatusService.isCreatorOnline(
      creatorRecord.id
    );
    const lastSeenAt = await CreatorOnlineStatusService.getLastSeenAt(
      creatorRecord.id
    );

    return NextResponse.json({
      isOnline,
      lastSeenAt: lastSeenAt?.toISOString() || null,
    });
  } catch (error) {
    console.error("Error fetching creator online status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
