import { NextRequest, NextResponse } from "next/server";
import { isUserOnline } from "@/lib/livekit/presence";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const online = await isUserOnline(userId);

    return NextResponse.json({ online });
  } catch (error) {
    console.error("Error checking presence:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

