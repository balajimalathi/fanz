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

    // Only creator can reject requests
    if (conv.creatorId !== userId) {
      return NextResponse.json(
        { error: "Forbidden: Only the creator can reject chat requests" },
        { status: 403 }
      );
    }

    // Check if already rejected
    if (conv.requestStatus === "rejected") {
      return NextResponse.json(conv, { status: 200 });
    }

    // Reject the request
    const now = new Date();
    const [updatedConversation] = await db
      .update(conversation)
      .set({
        requestStatus: "rejected",
        rejectedAt: now,
        updatedAt: now,
      })
      .where(eq(conversation.id, conversationId))
      .returning();

    return NextResponse.json(updatedConversation, { status: 200 });
  } catch (error) {
    console.error("Error rejecting chat request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
