import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { serviceOrder, service, conversation } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getGlobalIO, sendToUser } from "@/lib/socketio/server";
import { ChatStartMessage } from "@/lib/websocket/types";

// POST - Creator starts chat conversation (triggers 30s window)
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

    // Verify user is the creator
    if (order.creatorId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify order is active
    if (order.status !== "active") {
      return NextResponse.json(
        { error: "Service order must be active" },
        { status: 400 }
      );
    }

    // Get service to verify it's a chat service
    const serviceRecord = await db.query.service.findFirst({
      where: (s, { eq: eqOp }) => eqOp(s.id, order.serviceId),
    });

    if (!serviceRecord || serviceRecord.serviceType !== "chat") {
      return NextResponse.json(
        { error: "Service order is not for chat" },
        { status: 400 }
      );
    }

    // Get or create conversation
    let conv = await db.query.conversation.findFirst({
      where: (c, { eq: eqOp, and: andOp }) =>
        andOp(
          eqOp(c.creatorId, order.creatorId),
          eqOp(c.fanId, order.userId)
        ),
    });

    if (!conv) {
      const [newConv] = await db
        .insert(conversation)
        .values({
          creatorId: order.creatorId,
          fanId: order.userId,
          serviceOrderId: orderId,
          isEnabled: false,
        })
        .returning();
      conv = newConv;
    } else if (!conv.serviceOrderId) {
      // Link conversation to service order if not already linked
      await db
        .update(conversation)
        .set({ serviceOrderId: orderId })
        .where(eq(conversation.id, conv.id));
    }

    // Check if both users are online
    const io = getGlobalIO();
    if (!io) {
      return NextResponse.json(
        { error: "Socket.IO server not available" },
        { status: 503 }
      );
    }

    const { isUserOnline } = await import("@/lib/socketio/server");
    const creatorOnline = isUserOnline(order.creatorId);
    const fanOnline = isUserOnline(order.userId);

    if (!creatorOnline || !fanOnline) {
      return NextResponse.json(
        { error: "Both users must be online to start chat" },
        { status: 400 }
      );
    }

    // Create chat:start message with 30-second expiration
    const expiresAt = Date.now() + 30000; // 30 seconds
    const chatStartMessage: ChatStartMessage = {
      type: "chat:start",
      timestamp: Date.now(),
      payload: {
        serviceOrderId: orderId,
        conversationId: conv.id,
        creatorId: order.creatorId,
        fanId: order.userId,
        expiresAt,
      },
    };

    // Send via WebSocket
    sendToUser(order.userId, chatStartMessage, io);

    return NextResponse.json({
      success: true,
      conversationId: conv.id,
      expiresAt,
    });
  } catch (error) {
    console.error("Error starting chat:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

