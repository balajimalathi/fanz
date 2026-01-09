import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { conversation, chatMessage } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import {
  queueMessageForPersistence,
  saveMessageDirectly,
  processQueuedMessages,
} from "@/lib/services/message-queue";
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

    // Generate message ID for optimistic response and database persistence
    const messageId = crypto.randomUUID();
    const timestamp = Date.now();

    // Queue message for async persistence
    const queuedMessage = {
      id: messageId,
      conversationId,
      senderId: userId,
      messageType,
      content: content || null,
      mediaUrl: mediaUrl || null,
      thumbnailUrl: thumbnailUrl || null,
      timestamp,
    };

    // Save message immediately in the background (fire and forget)
    // This ensures persistence happens quickly while not blocking the response
    const savePromise = saveMessageDirectly(queuedMessage).then((savedMessage) => {
      if (savedMessage) {
        // Publish to Redis pub/sub after successful save
        publishMessage(conversationId, savedMessage).catch((error) => {
          console.error("[Messages API] Error publishing saved message to Redis pub/sub:", error);
        });
        return savedMessage;
      }
      return null;
    }).catch((error) => {
      console.error("[Messages API] Error saving message directly:", error);
      // If direct save fails, queue it for retry
      queueMessageForPersistence(queuedMessage).catch((queueError) => {
        console.error("[Messages API] Error queueing message after save failure:", queueError);
      });
      return null;
    });

    // Also queue the message as a backup (for reliability and retry mechanism)
    const streamId = await queueMessageForPersistence(queuedMessage);

    // Create optimistic message object for immediate response
    const optimisticMessage = {
      id: messageId,
      conversationId,
      senderId: userId,
      messageType,
      content: content || null,
      mediaUrl: mediaUrl || null,
      thumbnailUrl: thumbnailUrl || null,
      readAt: null,
      createdAt: new Date(timestamp).toISOString(),
    };

    // Publish immediately to Redis pub/sub for real-time delivery
    // This ensures the other side sees the message right away
    publishMessage(conversationId, optimisticMessage).catch((error) => {
      console.error("[Messages API] Error publishing optimistic message to Redis pub/sub:", error);
    });

    // Update optimistic message with saved data when available (non-blocking)
    savePromise.then((savedMessage) => {
      if (savedMessage) {
        console.log("[Messages API] Message saved successfully:", savedMessage.id);
      }
    });

    console.log("[Messages API] Message queued successfully, streamId:", streamId);
    return NextResponse.json(optimisticMessage, { status: 201 });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

