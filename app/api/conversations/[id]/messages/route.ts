import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { conversation, chatMessage } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { publishMessage } from "@/lib/utils/redis-pubsub";

// GET - List messages for a conversation
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

    const userId = session.user.id;
    if (conv.creatorId !== userId && conv.fanId !== userId) {
      return NextResponse.json(
        { error: "Forbidden: You don't have access to this conversation" },
        { status: 403 }
      );
    }

    // Get messages
    const messages = await db.query.chatMessage.findMany({
      where: (m, { eq: eqOp }) => eqOp(m.conversationId, conversationId),
      orderBy: [desc(chatMessage.createdAt)],
      limit: 100, // Get last 100 messages
    });

    // Reverse to get chronological order (oldest first)
    messages.reverse();

    return NextResponse.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Send a message
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
    const body = await request.json();
    const { content, messageType = "text", mediaUrl, thumbnailUrl } = body;

    if (!content && !mediaUrl) {
      return NextResponse.json(
        { error: "content or mediaUrl is required" },
        { status: 400 }
      );
    }

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

    const userId = session.user.id;
    if (conv.creatorId !== userId && conv.fanId !== userId) {
      return NextResponse.json(
        { error: "Forbidden: You don't have access to this conversation" },
        { status: 403 }
      );
    }

    // Create message
    const [newMessage] = await db
      .insert(chatMessage)
      .values({
        conversationId,
        senderId: userId,
        messageType,
        content: content || null,
        mediaUrl: mediaUrl || null,
        thumbnailUrl: thumbnailUrl || null,
      })
      .returning();

    // Update conversation last message
    await db
      .update(conversation)
      .set({
        lastMessageAt: new Date(),
        lastMessagePreview: content || (mediaUrl ? "Media" : ""),
        updatedAt: new Date(),
      })
      .where(eq(conversation.id, conversationId));

    // Publish message to Redis for real-time updates
    await publishMessage(conversationId, newMessage);

    return NextResponse.json(newMessage, { status: 201 });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

