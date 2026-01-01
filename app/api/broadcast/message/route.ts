import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { broadcastMessage, creator, follower } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { sendPushNotificationsToUsers } from "@/lib/push/fcm";
import { env } from "@/env";

const broadcastMessageSchema = z.object({
  followerIds: z.array(z.string()).min(1, "At least one follower must be selected"),
  messageType: z.enum(["text", "audio"]),
  content: z.string().optional(),
  audioUrl: z.string().url().optional(),
});

// POST - Send private message broadcast
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

    // Check if user has creator role
    if (session.user.role !== "creator") {
      return NextResponse.json(
        { error: "Forbidden: Creator role required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validationResult = broadcastMessageSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { followerIds, messageType, content, audioUrl } = validationResult.data;

    // Validate message content based on type
    if (messageType === "text" && !content) {
      return NextResponse.json(
        { error: "Content is required for text messages" },
        { status: 400 }
      );
    }

    if (messageType === "audio" && !audioUrl) {
      return NextResponse.json(
        { error: "Audio URL is required for audio messages" },
        { status: 400 }
      );
    }

    // Verify all follower IDs belong to this creator
    const validFollowers = await db
      .select()
      .from(follower)
      .where(eq(follower.creatorId, session.user.id));

    const validFollowerIds = validFollowers.map((f) => f.followerId);
    const invalidIds = followerIds.filter((id) => !validFollowerIds.includes(id));

    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: "One or more follower IDs are invalid" },
        { status: 400 }
      );
    }

    // Get creator info
    const creatorRecord = await db.query.creator.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, session.user.id),
    });

    if (!creatorRecord) {
      return NextResponse.json(
        { error: "Creator not found" },
        { status: 404 }
      );
    }

    // Create broadcast message record
    const broadcast = await db.insert(broadcastMessage).values({
      creatorId: session.user.id,
      followerIds,
      messageType,
      content: content || null,
      audioUrl: audioUrl || null,
    }).returning();

    // Send push notifications
    const notificationTitle = `Message from ${creatorRecord.displayName}`;
    const notificationBody = messageType === "text" 
      ? (content || "New message")
      : "New audio message";

    const pushResult = await sendPushNotificationsToUsers(followerIds, {
      title: notificationTitle,
      body: notificationBody,
      icon: creatorRecord.profileImageUrl || undefined,
      click_action: `${env.NEXT_PUBLIC_APP_URL}/u/${creatorRecord.username || creatorRecord.id}`,
      data: {
        type: "broadcast",
        messageId: broadcast[0].id,
        creatorId: session.user.id,
        messageType,
        link: `${env.NEXT_PUBLIC_APP_URL}/u/${creatorRecord.username || creatorRecord.id}`,
      },
    });

    return NextResponse.json({
      success: true,
      messageId: broadcast[0].id,
      pushNotificationsSent: pushResult.sent,
      pushNotificationsFailed: pushResult.failed,
    });
  } catch (error) {
    console.error("Error sending broadcast message:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

