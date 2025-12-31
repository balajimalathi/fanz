import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { conversation, user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { publishTypingEvent } from "@/lib/utils/redis-pubsub";

// POST - Publish typing event
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

    const { id: conversationId } = await params;
    const userId = session.user.id;

    // Verify conversation exists and user has access
    const conv = await db.query.conversation.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, conversationId),
    });

    if (!conv) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    if (conv.creatorId !== userId && conv.fanId !== userId) {
      return NextResponse.json(
        { error: "Forbidden: You don't have access to this conversation" },
        { status: 403 }
      );
    }

    // Get user name for typing event
    const userRecord = await db.query.user.findFirst({
      where: (u, { eq: eqOp }) => eqOp(u.id, userId),
    });

    const userName = userRecord?.name || "User";

    // Publish typing event to Redis
    await publishTypingEvent(conversationId, userId, userName);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error publishing typing event:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

