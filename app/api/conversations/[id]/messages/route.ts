import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { conversation, chatMessage } from "@/lib/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import {
  queueMessageForPersistence,
  saveMessageDirectly,
  processQueuedMessages,
} from "@/lib/services/message-queue";
import { publishMessage } from "@/lib/utils/redis-pubsub";
import { CreatorOnlineStatusService } from "@/lib/services/creator-online-status-service";
import { CreatorPricingService } from "@/lib/services/creator-pricing-service";
import { DMChargeService } from "@/lib/services/dm-charge-service";
import { WalletService } from "@/lib/wallet/wallet-service";
import { AvailabilityService } from "@/lib/services/availability-service";
import { format } from "date-fns";

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

    // Get messages in chronological order (oldest first)
    const messages = await db.query.chatMessage.findMany({
      where: (m, { eq: eqOp }) => eqOp(m.conversationId, conversationId),
      orderBy: [asc(chatMessage.createdAt)],
      limit: 100, // Get last 100 messages
    });

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

    // Check if fan is sending message (need to check creator online status and pricing)
    const isFan = conv.fanId === userId;
    const isCreator = conv.creatorId === userId;

    let coinsPending: number | null = null;

    if (isFan) {
      // Fan sending message - check if creator is online
      const creatorOnline = await CreatorOnlineStatusService.isCreatorOnline(
        conv.creatorId
      );

      if (!creatorOnline) {
        return NextResponse.json(
          { error: "Creator is offline. DM features are disabled." },
          { status: 400 }
        );
      }

      // Get fan's timezone from request headers (browser timezone)
      const fanTimezone =
        request.headers.get("x-user-timezone") ||
        Intl.DateTimeFormat().resolvedOptions().timeZone ||
        "UTC";

      // Check if creator is available for chats
      const availability = await AvailabilityService.isCreatorAvailableForChats(
        conv.creatorId,
        fanTimezone
      );

      if (!availability.available) {
        let errorMessage = "Creator is not available for chats at this time.";
        if (availability.schedule) {
          errorMessage += ` Available hours: ${availability.schedule}`;
        }
        if (availability.nextAvailableTime) {
          const nextTime = format(
            availability.nextAvailableTime,
            "PPp",
            { timeZone: fanTimezone }
          );
          errorMessage += ` Next available: ${nextTime}`;
        }
        return NextResponse.json({ error: errorMessage }, { status: 400 });
      }

      // Get pricing for message type
      const price = await CreatorPricingService.getDmPrice(
        conv.creatorId,
        messageType as "text" | "image" | "video"
      );

      if (price > 0) {
        // Check balance (preview only, don't deduct yet)
        const balance = await WalletService.getBalance(userId);
        if (balance < price) {
          return NextResponse.json(
            { error: "Insufficient balance" },
            { status: 400 }
          );
        }

        // Set pending coins (will be deducted when creator replies)
        coinsPending = price;
      }
    } else if (isCreator) {
      // Creator sending message - process pending charges from fan messages
      try {
        await DMChargeService.processPendingCharges(conversationId, userId);
      } catch (error) {
        console.error("Error processing pending DM charges:", error);
        // Don't block creator's message if charge processing fails
      }
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
      coinsPending,
      coinsDeducted: false,
      timestamp,
    };

    // Save message immediately in the background (fire and forget)
    // This ensures persistence happens quickly while not blocking the response
    const savePromise = saveMessageDirectly(queuedMessage).then((savedMessage) => {
      if (savedMessage) {
        // Normalize createdAt to ISO string for consistent format
        const normalizedMessage = {
          ...savedMessage,
          createdAt: savedMessage.createdAt instanceof Date 
            ? savedMessage.createdAt.toISOString() 
            : typeof savedMessage.createdAt === 'string'
            ? savedMessage.createdAt
            : new Date(timestamp).toISOString(),
        };
        // Publish to Redis pub/sub after successful save
        publishMessage(conversationId, normalizedMessage).catch((error) => {
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
      coinsPending: coinsPending,
      coinsDeducted: false,
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

