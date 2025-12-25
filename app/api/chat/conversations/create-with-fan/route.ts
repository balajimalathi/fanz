import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { conversation, follower } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const createConversationSchema = z.object({
  fanId: z.string(),
});

// POST - Create conversation (creator initiating with fan)
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

    const { fanId } = validationResult.data;
    const creatorId = session.user.id;

    // Verify fan is following this creator
    const isFollowing = await db.query.follower.findFirst({
      where: (f, { eq: eqOp, and: andOp }) =>
        andOp(
          eqOp(f.followerId, fanId),
          eqOp(f.creatorId, creatorId)
        ),
    });

    if (!isFollowing) {
      return NextResponse.json(
        { error: "This user is not following you" },
        { status: 403 }
      );
    }

    // Check if conversation already exists
    const existing = await db.query.conversation.findFirst({
      where: (c, { eq: eqOp, and: andOp }) =>
        andOp(
          eqOp(c.creatorId, creatorId),
          eqOp(c.fanId, fanId)
        ),
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        conversation: existing,
      });
    }

    // Create new conversation - enabled by default when creator initiates
    const [newConversation] = await db
      .insert(conversation)
      .values({
        creatorId,
        fanId,
        isEnabled: true, // Enabled when creator initiates
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

