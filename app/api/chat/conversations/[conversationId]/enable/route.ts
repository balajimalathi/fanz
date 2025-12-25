import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { conversation } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sendPushNotificationsToUsers } from "@/lib/push/fcm";
import { env } from "@/env";

// POST - Enable conversation (creator only)
export async function POST(
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

    // Check if user has creator role
    if (session.user.role !== "creator") {
      return NextResponse.json(
        { error: "Forbidden: Creator role required" },
        { status: 403 }
      );
    }

    const { conversationId } = await params;

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

    // Verify user is the creator
    if (conv.creatorId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden: You can only enable your own conversations" },
        { status: 403 }
      );
    }

    // Enable conversation
    await db
      .update(conversation)
      .set({
        isEnabled: true,
        updatedAt: new Date(),
      })
      .where(eq(conversation.id, conversationId));

    // Send push notification to fan
    try {
      const creatorRecord = await db.query.creator.findFirst({
        where: (c, { eq: eqOp }) => eqOp(c.id, session.user.id),
      });

      await sendPushNotificationsToUsers([conv.fanId], {
        title: `Chat enabled with ${creatorRecord?.displayName || "Creator"}`,
        body: "You can now start chatting!",
        data: {
          type: "chat_enabled",
          conversationId,
          creatorId: session.user.id,
          link: `${env.NEXT_PUBLIC_APP_URL}/u/${creatorRecord?.username || session.user.id}`,
        },
      });
    } catch (error) {
      console.error("Failed to send push notification:", error);
    }

    return NextResponse.json({ success: true, isEnabled: true });
  } catch (error) {
    console.error("Error enabling conversation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

