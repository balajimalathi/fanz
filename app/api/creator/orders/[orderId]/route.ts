import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/client"
import { serviceOrder, service } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { orderId } = await params
    const body = await request.json()
    const { status, fulfillmentNotes } = body

    if (!status || !["pending", "active", "fulfilled", "cancelled"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be pending, active, fulfilled, or cancelled" },
        { status: 400 }
      )
    }

    // Get order and verify it belongs to this creator
    const order = await db.query.serviceOrder.findFirst({
      where: (so, { eq: eqOp }) => eqOp(so.id, orderId),
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    if (order.creatorId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // If activating, use the activate endpoint instead
    if (status === "active" && order.status === "pending") {
      return NextResponse.json(
        { error: "Use /activate endpoint to activate orders" },
        { status: 400 }
      );
    }

    // If fulfilling, validate participation for call/chat services
    if (status === "fulfilled") {
      const serviceRecord = await db.query.service.findFirst({
        where: (s, { eq: eqOp }) => eqOp(s.id, order.serviceId),
      });

      if (serviceRecord) {
        const serviceType = serviceRecord.serviceType;
        
        // For call and chat services, both parties must have joined
        if (serviceType === "audio_call" || serviceType === "video_call" || serviceType === "chat") {
          if (!order.utilizedAt) {
            return NextResponse.json(
              { 
                error: "Service cannot be fulfilled. Both parties must participate before fulfillment.",
                details: {
                  customerJoined: !!order.customerJoinedAt,
                  creatorJoined: !!order.creatorJoinedAt,
                }
              },
              { status: 400 }
            );
          }
        }
        // For shoutout services, no participation validation needed
      }
    }

    // Update order
    await db
      .update(serviceOrder)
      .set({
        status: status as "pending" | "active" | "fulfilled" | "cancelled",
        fulfillmentNotes: fulfillmentNotes || null,
        updatedAt: new Date(),
      })
      .where(eq(serviceOrder.id, orderId))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating service order:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

