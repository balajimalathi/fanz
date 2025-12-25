import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { chatMessage, conversation } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// POST - Mark message as read
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
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

    const { messageId } = await params;

    // Get message
    const message = await db.query.chatMessage.findFirst({
      where: (m, { eq: eqOp }) => eqOp(m.id, messageId),
    });

    if (!message) {
      return NextResponse.json(
        { error: "Message not found" },
        { status: 404 }
      );
    }

    // Verify user is part of conversation (but not the sender)
    const conv = await db.query.conversation.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, message.conversationId),
    });

    if (!conv) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    if (conv.creatorId !== session.user.id && conv.fanId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    if (message.senderId === session.user.id) {
      return NextResponse.json(
        { error: "Cannot mark your own message as read" },
        { status: 400 }
      );
    }

    // Update read status if not already read
    if (!message.readAt) {
      await db
        .update(chatMessage)
        .set({ readAt: new Date() })
        .where(eq(chatMessage.id, messageId));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking message as read:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

