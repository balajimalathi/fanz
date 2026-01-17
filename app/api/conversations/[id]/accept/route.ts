import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { conversation } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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

    // Only creator can accept requests
    if (conv.creatorId !== userId) {
      return NextResponse.json(
        { error: "Forbidden: Only the creator can accept chat requests" },
        { status: 403 }
      );
    }

    // Check if already accepted or rejected
    if (conv.requestStatus === "accepted") {
      return NextResponse.json(conv, { status: 200 });
    }

    if (conv.requestStatus === "rejected") {
      return NextResponse.json(
        { error: "Cannot accept a rejected request. Please create a new conversation." },
        { status: 400 }
      );
    }

    // Accept the request
    const now = new Date();
    const [updatedConversation] = await db
      .update(conversation)
      .set({
        requestStatus: "accepted",
        acceptedAt: now,
        updatedAt: now,
      })
      .where(eq(conversation.id, conversationId))
      .returning();

    return NextResponse.json(updatedConversation, { status: 200 });
  } catch (error) {
    console.error("Error accepting chat request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
