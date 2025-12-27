import { NextRequest, NextResponse } from "next/server";
import { isUserOnline } from "@/lib/socketio/server";

// GET - Check if user is online (for initial state fetch only)
// Real-time updates are handled via Socket.IO presence events
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    // Check if user is online via Socket.IO (no database query needed)
    const online = isUserOnline(userId);

    return NextResponse.json({
      online,
    });
  } catch (error) {
    console.error("Error checking online status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

