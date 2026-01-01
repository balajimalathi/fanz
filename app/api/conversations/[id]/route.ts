import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { conversation, user, creator } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// GET - Get a single conversation by ID
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

    const { id: conversationId } = await params;

    // Get conversation
    const conv = await db.query.conversation.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, conversationId),
    });

    if (!conv) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Verify user has access
    const userId = session.user.id;
    if (conv.creatorId !== userId && conv.fanId !== userId) {
      return NextResponse.json(
        { error: "Forbidden: You don't have access to this conversation" },
        { status: 403 }
      );
    }

    // Fetch other user details
    const otherUserId = conv.creatorId === userId ? conv.fanId : conv.creatorId;
    const otherUser = await db.query.user.findFirst({
      where: (u, { eq: eqOp }) => eqOp(u.id, otherUserId),
    });

    const otherCreator = conv.creatorId !== userId
      ? await db.query.creator.findFirst({
          where: (c, { eq: eqOp }) => eqOp(c.id, conv.creatorId),
        })
      : null;

    return NextResponse.json({
      id: conv.id,
      creatorId: conv.creatorId,
      fanId: conv.fanId,
      otherUserId,
      otherUserName: otherUser?.name || "Unknown",
      otherUserImage: otherUser?.image || null,
      creatorDisplayName: otherCreator?.displayName || null,
      lastMessageAt: conv.lastMessageAt,
      lastMessagePreview: conv.lastMessagePreview,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
    });
  } catch (error) {
    console.error("Error fetching conversation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

