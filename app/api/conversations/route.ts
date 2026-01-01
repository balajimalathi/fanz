import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { conversation, user, creator } from "@/lib/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";

// GET - List conversations for the authenticated user
export async function GET(request: NextRequest) {
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

    const userId = session.user.id;
    const isCreator = session.user.role === "creator";

    // Get conversations where user is either creator or fan
    const conversations = await db.query.conversation.findMany({
      where: isCreator
        ? (c, { eq: eqOp }) => eqOp(c.creatorId, userId)
        : (c, { eq: eqOp }) => eqOp(c.fanId, userId),
      orderBy: [desc(conversation.lastMessageAt), desc(conversation.updatedAt)],
    });

    // Fetch user/creator details for each conversation
    const userIds = conversations.map((c) => (isCreator ? c.fanId : c.creatorId));
    const uniqueUserIds = [...new Set(userIds)];
    const users = uniqueUserIds.length > 0
      ? await db
          .select()
          .from(user)
          .where(inArray(user.id, uniqueUserIds))
      : [];

    const creatorIds = isCreator ? [] : [...new Set(conversations.map((c) => c.creatorId))];
    const creators = creatorIds.length > 0
      ? await db
          .select()
          .from(creator)
          .where(inArray(creator.id, creatorIds))
      : [];

    const userMap = new Map(users.map((u) => [u.id, u]));
    const creatorMap = new Map(creators.map((c) => [c.id, c]));

    // Transform response
    const conversationsData = conversations.map((conv) => {
      const otherUserId = isCreator ? conv.fanId : conv.creatorId;
      const otherUser = userMap.get(otherUserId);
      const otherCreator = isCreator ? null : creatorMap.get(conv.creatorId);

      return {
        id: conv.id,
        otherUserId,
        otherUserName: otherUser?.name || "Unknown",
        otherUserImage: otherUser?.image || null,
        creatorDisplayName: otherCreator?.displayName || null,
        lastMessageAt: conv.lastMessageAt,
        lastMessagePreview: conv.lastMessagePreview,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
      };
    });

    return NextResponse.json(conversationsData);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create a new conversation
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
    const { creatorId, fanId } = body;

    const userId = session.user.id;
    const isCreator = session.user.role === "creator";

    // Validate input
    if (isCreator && !fanId) {
      return NextResponse.json(
        { error: "fanId is required for creators" },
        { status: 400 }
      );
    }

    if (!isCreator && !creatorId) {
      return NextResponse.json(
        { error: "creatorId is required for fans" },
        { status: 400 }
      );
    }

    const finalCreatorId = isCreator ? userId : creatorId!;
    const finalFanId = isCreator ? fanId! : userId;

    // Check if conversation already exists
    const existingConv = await db.query.conversation.findFirst({
      where: (c, { eq: eqOp, and: andOp }) =>
        andOp(eqOp(c.creatorId, finalCreatorId), eqOp(c.fanId, finalFanId)),
    });

    if (existingConv) {
      return NextResponse.json(existingConv, { status: 200 });
    }

    // Verify creator exists
    const creatorRecord = await db.query.creator.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, finalCreatorId),
    });

    if (!creatorRecord) {
      return NextResponse.json(
        { error: "Creator not found" },
        { status: 404 }
      );
    }

    // Verify fan exists
    const fanRecord = await db.query.user.findFirst({
      where: (u, { eq: eqOp }) => eqOp(u.id, finalFanId),
    });

    if (!fanRecord) {
      return NextResponse.json(
        { error: "Fan not found" },
        { status: 404 }
      );
    }

    // Create conversation
    const [newConversation] = await db
      .insert(conversation)
      .values({
        creatorId: finalCreatorId,
        fanId: finalFanId,
        isEnabled: true,
      })
      .returning();

    return NextResponse.json(newConversation, { status: 201 });
  } catch (error) {
    console.error("Error creating conversation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

