import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { conversation, creator, user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// GET - Get conversation details
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

    // Verify user is part of conversation
    if (conv.creatorId !== userId && conv.fanId !== userId) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // Get other participant info
    const otherUserId = conv.creatorId === userId ? conv.fanId : conv.creatorId;
    const isCreator = conv.creatorId === userId;

    let otherParticipant;
    if (isCreator) {
      const fanRecord = await db.query.user.findFirst({
        where: (u, { eq: eqOp }) => eqOp(u.id, otherUserId),
      });
      otherParticipant = {
        id: fanRecord?.id,
        name: fanRecord?.name,
        image: fanRecord?.image,
        role: "fan",
      };
    } else {
      const creatorRecord = await db.query.creator.findFirst({
        where: (c, { eq: eqOp }) => eqOp(c.id, otherUserId),
      });
      const userRecord = await db.query.user.findFirst({
        where: (u, { eq: eqOp }) => eqOp(u.id, otherUserId),
      });
      otherParticipant = {
        id: creatorRecord?.id,
        name: creatorRecord?.displayName || userRecord?.name,
        image: creatorRecord?.profileImageUrl || userRecord?.image,
        username: creatorRecord?.username,
        role: "creator",
      };
    }

    return NextResponse.json({
      id: conv.id,
      creatorId: conv.creatorId,
      fanId: conv.fanId,
      otherParticipant,
      isEnabled: conv.isEnabled,
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

