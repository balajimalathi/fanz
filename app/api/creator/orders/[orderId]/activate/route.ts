import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { serviceOrder, notification, user, service } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// PATCH - Activate a service order (change status from pending to active)
export async function PATCH(
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

    // Get order and verify it belongs to this creator
    const order = await db.query.serviceOrder.findFirst({
      where: (so, { eq: eqOp }) => eqOp(so.id, orderId),
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.creatorId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify order is in pending status
    if (order.status !== "pending") {
      return NextResponse.json(
        { error: "Order can only be activated from pending status" },
        { status: 400 }
      );
    }

    // Update order to active status
    await db
      .update(serviceOrder)
      .set({
        status: "active",
        activatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(serviceOrder.id, orderId));

    // Get service details for notification
    const serviceRecord = await db.query.service.findFirst({
      where: (s, { eq: eqOp }) => eqOp(s.id, order.serviceId),
    });

    // Get creator details for notification
    const creatorUser = await db.query.user.findFirst({
      where: (u, { eq: eqOp }) => eqOp(u.id, order.creatorId),
    });

    // Send notification to customer
    await db.insert(notification).values({
      userId: order.userId,
      type: "service_order_activated",
      title: "Service Order Activated",
      message: `${creatorUser?.name || "Creator"} has activated your service order: ${serviceRecord?.name || "Service"}`,
      link: `/u/${creatorUser?.id}/services`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error activating service order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

