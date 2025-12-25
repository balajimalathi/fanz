import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { conversation, chatMessage } from "@/lib/db/schema";
import { eq, desc, lt } from "drizzle-orm";

// GET - Get messages with pagination
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
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

    const { conversationId } = await params;
    const userId = session.user.id;

    // Verify user is part of conversation
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
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // Get cursor from query params
    const searchParams = request.nextUrl.searchParams;
    const cursor = searchParams.get("cursor");
    const limit = parseInt(searchParams.get("limit") || "50");

    // Build query
    let query = db
      .select()
      .from(chatMessage)
      .where(eq(chatMessage.conversationId, conversationId));

    // If cursor provided, only get messages before that cursor
    if (cursor) {
      const cursorMessage = await db.query.chatMessage.findFirst({
        where: (m, { eq: eqOp }) => eqOp(m.id, cursor),
      });
      if (cursorMessage) {
        query = query.where(
          lt(chatMessage.createdAt, cursorMessage.createdAt)
        );
      }
    }

    const messages = await query
      .orderBy(desc(chatMessage.createdAt))
      .limit(limit);

    // Reverse to get chronological order
    const reversedMessages = messages.reverse();

    // Return with next cursor
    const nextCursor =
      reversedMessages.length === limit
        ? reversedMessages[reversedMessages.length - 1].id
        : null;

    return NextResponse.json({
      messages: reversedMessages,
      nextCursor,
      hasMore: nextCursor !== null,
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

