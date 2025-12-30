import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { serviceOrder } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { isUserOnline } from "@/lib/livekit/presence";
import { getOrCreateConversation } from "@/lib/db/conversations";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId } = await params;

    // Get service order
    const order = await db.query.serviceOrder.findFirst({
      where: (so, { eq: eqOp }) => eqOp(so.id, orderId),
    });

    if (!order) {
      return NextResponse.json(
        { error: "Service order not found" },
        { status: 404 }
      );
    }

    // Verify user is the creator
    if (order.creatorId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden: Only creator can start fulfillment" },
        { status: 403 }
      );
    }

    // Verify order is active
    if (order.status !== "active") {
      return NextResponse.json(
        { error: "Service order must be active to start fulfillment" },
        { status: 400 }
      );
    }

    // Check if both parties are online
    const [creatorOnline, fanOnline] = await Promise.all([
      isUserOnline(order.creatorId),
      isUserOnline(order.userId),
    ]);

    if (!creatorOnline || !fanOnline) {
      return NextResponse.json(
        {
          error: "Both parties must be online to start fulfillment",
          onlineStatus: {
            creator: creatorOnline,
            fan: fanOnline,
          },
        },
        { status: 400 }
      );
    }

    // Update service order
    const now = new Date();
    await db
      .update(serviceOrder)
      .set({
        utilizedAt: now,
        creatorJoinedAt: now,
        updatedAt: now,
      })
      .where(eq(serviceOrder.id, orderId));

    // Create conversation if it doesn't exist
    const conversation = await getOrCreateConversation(orderId);

    return NextResponse.json({
      success: true,
      conversationId: conversation.id,
      utilizedAt: now.toISOString(),
    });
  } catch (error) {
    console.error("Error starting fulfillment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

