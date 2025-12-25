import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { conversation, creator, follower } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const createConversationSchema = z.object({
  creatorId: z.string(),
});

// POST - Create or get existing conversation
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
    const validationResult = createConversationSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { creatorId } = validationResult.data;
    const userId = session.user.id;

    // Verify creator exists
    const creatorRecord = await db.query.creator.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, creatorId),
    });

    if (!creatorRecord) {
      return NextResponse.json(
        { error: "Creator not found" },
        { status: 404 }
      );
    }

    // Check if user is following creator (for fans)
    if (userId !== creatorId) {
      const isFollowing = await db.query.follower.findFirst({
        where: (f, { eq: eqOp, and: andOp }) =>
          andOp(
            eqOp(f.followerId, userId),
            eqOp(f.creatorId, creatorId)
          ),
      });

      if (!isFollowing) {
        return NextResponse.json(
          { error: "You must follow the creator to start a conversation" },
          { status: 403 }
        );
      }
    }

    // Check if conversation already exists
    const existing = await db.query.conversation.findFirst({
      where: (c, { eq: eqOp, and: andOp }) =>
        andOp(
          eqOp(c.creatorId, creatorId),
          eqOp(c.fanId, userId)
        ),
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        conversation: existing,
      });
    }

    // Create new conversation
    const [newConversation] = await db
      .insert(conversation)
      .values({
        creatorId,
        fanId: userId,
      })
      .returning();

    return NextResponse.json({
      success: true,
      conversation: newConversation,
    });
  } catch (error) {
    console.error("Error creating conversation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

