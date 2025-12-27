import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { serviceOrder } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getGlobalIO, sendToUser } from "@/lib/socketio/server";
import { ChatAcceptMessage } from "@/lib/websocket/types";

// POST - User accepts chat start
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
    const userId = session.user.id;

    // Get service order
    const order = await db.query.serviceOrder.findFirst({
      where: (so, { eq: eqOp }) => eqOp(so.id, orderId),
    });

    if (!order) {
      return NextResponse.json({ error: "Service order not found" }, { status: 404 });
    }

    // Verify user is part of this order (creator or fan)
    if (order.creatorId !== userId && order.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get conversation
    const conv = await db.query.conversation.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.serviceOrderId, orderId),
    });

    if (!conv) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const io = getGlobalIO();
    if (!io) {
      return NextResponse.json(
        { error: "Socket.IO server not available" },
        { status: 503 }
      );
    }

    // Create chat:accept message
    const chatAcceptMessage: ChatAcceptMessage = {
      type: "chat:accept",
      timestamp: Date.now(),
      payload: {
        serviceOrderId: orderId,
        conversationId: conv.id,
        userId,
      },
    };

    // Send via WebSocket (will be handled by socket handler)
    const otherUserId = order.creatorId === userId ? order.userId : order.creatorId;
    sendToUser(otherUserId, chatAcceptMessage, io);

    return NextResponse.json({
      success: true,
      conversationId: conv.id,
    });
  } catch (error) {
    console.error("Error accepting chat:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

