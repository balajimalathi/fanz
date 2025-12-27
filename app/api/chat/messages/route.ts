import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { conversation, chatMessage, user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { 
  checkServiceOrderAccess, 
  linkServiceOrderToConversation, 
  trackServiceOrderParticipation 
} from "@/lib/utils/service-orders";

const sendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  messageType: z.enum(["text", "image", "audio", "video"]),
  content: z.string().optional(),
  mediaUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url().optional(),
});

// POST - Send message (HTTP fallback)
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const validationResult = sendMessageSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { conversationId, messageType, content, mediaUrl, thumbnailUrl } =
      validationResult.data;

    // Verify conversation exists and user is part of it
    const conv = await db.query.conversation.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, conversationId),
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

    // Determine if sender is creator or fan
    const senderUser = await db.query.user.findFirst({
      where: (u, { eq: eqOp }) => eqOp(u.id, session.user.id),
    });
    const senderIsCreator = senderUser?.role === "creator";
    const senderIsFan = !senderIsCreator && conv.fanId === session.user.id;

    // Check if conversation is enabled or if there's an active service order
    if (!conv.isEnabled && conv.creatorId !== session.user.id) {
      // Fan trying to send message - check for active service order
      if (senderIsFan) {
        const activeServiceOrder = await checkServiceOrderAccess(
          session.user.id,
          conv.creatorId,
          "chat"
        );

        if (!activeServiceOrder) {
          return NextResponse.json(
            { error: "This conversation is not enabled. You need an active service order to chat." },
            { status: 403 }
          );
        }

        // Link service order to conversation if not already linked
        if (!conv.serviceOrderId && activeServiceOrder) {
          await linkServiceOrderToConversation(activeServiceOrder.id, conversationId);
          // Enable conversation when service order is linked
          await db
            .update(conversation)
            .set({
              isEnabled: true,
              serviceOrderId: activeServiceOrder.id,
              updatedAt: new Date(),
            })
            .where(eq(conversation.id, conversationId));
        }
      } else {
        return NextResponse.json(
          { error: "This conversation is not enabled yet. Please wait for the creator to enable it." },
          { status: 403 }
        );
      }
    }

    // Validate message content
    if (messageType === "text" && !content) {
      return NextResponse.json(
        { error: "Content is required for text messages" },
        { status: 400 }
      );
    }

    if (
      (messageType === "image" || messageType === "audio" || messageType === "video") &&
      !mediaUrl
    ) {
      return NextResponse.json(
        { error: "Media URL is required for media messages" },
        { status: 400 }
      );
    }

    // Create message
    const [newMessage] = await db
      .insert(chatMessage)
      .values({
        conversationId,
        senderId: session.user.id,
        messageType,
        content: content || null,
        mediaUrl: mediaUrl || null,
        thumbnailUrl: thumbnailUrl || null,
      })
      .returning();

    // Update conversation
    await db
      .update(conversation)
      .set({
        lastMessageAt: new Date(),
        lastMessagePreview:
          messageType === "text"
            ? (content?.substring(0, 100) || null)
            : `${messageType} message`,
        updatedAt: new Date(),
      })
      .where(eq(conversation.id, conversationId));

    // Get updated conversation to check service order
    const updatedConv = await db.query.conversation.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, conversationId),
    });

    // Track participation for service order
    if (updatedConv?.serviceOrderId) {
      await trackServiceOrderParticipation(
        updatedConv.serviceOrderId,
        session.user.id,
        senderIsCreator
      );
    }

    return NextResponse.json({
      success: true,
      message: newMessage,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

