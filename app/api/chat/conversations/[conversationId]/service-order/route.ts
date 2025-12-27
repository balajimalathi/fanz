import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { conversation, serviceOrder, service } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// GET - Get service order details for conversation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { conversationId } = await params;
    const userId = session.user.id;

    // Get conversation
    const conv = await db.query.conversation.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, conversationId),
    });

    if (!conv) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Verify user is part of conversation
    if (conv.creatorId !== userId && conv.fanId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get service order if linked
    if (!conv.serviceOrderId) {
      return NextResponse.json({
        hasServiceOrder: false,
      });
    }

    const order = await db.query.serviceOrder.findFirst({
      where: (so, { eq: eqOp }) => eqOp(so.id, conv.serviceOrderId!),
    });

    if (!order) {
      return NextResponse.json({
        hasServiceOrder: false,
      });
    }

    // Get service details
    const serviceRecord = await db.query.service.findFirst({
      where: (s, { eq: eqOp }) => eqOp(s.id, order.serviceId),
    });

    // Calculate remaining time if service has started
    let remainingTime = null;
    if (order.utilizedAt && serviceRecord?.duration) {
      const durationMs = serviceRecord.duration * 60 * 1000; // Convert minutes to ms
      const elapsed = Date.now() - new Date(order.utilizedAt).getTime();
      const remaining = Math.max(0, durationMs - elapsed);
      remainingTime = Math.floor(remaining / 1000); // Return in seconds
    }

    return NextResponse.json({
      hasServiceOrder: true,
      serviceOrder: {
        id: order.id,
        status: order.status,
        activatedAt: order.activatedAt,
        utilizedAt: order.utilizedAt,
        customerJoinedAt: order.customerJoinedAt,
        creatorJoinedAt: order.creatorJoinedAt,
      },
      service: serviceRecord
        ? {
            id: serviceRecord.id,
            name: serviceRecord.name,
            serviceType: serviceRecord.serviceType,
            duration: serviceRecord.duration, // in minutes
          }
        : null,
      remainingTime, // in seconds
    });
  } catch (error) {
    console.error("Error getting service order info:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

