import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { CreatorOnlineStatusService } from "@/lib/services/creator-online-status-service";

// POST - Update creator's online status (heartbeat)
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has creator role
    if (session.user.role !== "creator") {
      return NextResponse.json(
        { error: "Forbidden: Creator role required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { isOnline } = body;

    if (typeof isOnline !== "boolean") {
      return NextResponse.json(
        { error: "isOnline must be a boolean" },
        { status: 400 }
      );
    }

    await CreatorOnlineStatusService.updateOnlineStatus(
      session.user.id,
      isOnline
    );

    return NextResponse.json({ success: true, isOnline });
  } catch (error) {
    console.error("Error updating online status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET - Get current user's online status
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has creator role
    if (session.user.role !== "creator") {
      return NextResponse.json(
        { error: "Forbidden: Creator role required" },
        { status: 403 }
      );
    }

    const isOnline = await CreatorOnlineStatusService.isCreatorOnline(
      session.user.id
    );
    const lastSeenAt = await CreatorOnlineStatusService.getLastSeenAt(
      session.user.id
    );

    return NextResponse.json({
      isOnline,
      lastSeenAt: lastSeenAt?.toISOString() || null,
    });
  } catch (error) {
    console.error("Error fetching online status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
