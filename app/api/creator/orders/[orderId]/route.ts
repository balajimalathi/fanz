import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/client"
import { serviceOrder, service, user, paymentTransaction } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

// GET - Fetch single order details
export async function GET(
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

    // Get related data
    const serviceRecord = await db.query.service.findFirst({
      where: (s, { eq: eqOp }) => eqOp(s.id, order.serviceId),
    })

    const customer = await db.query.user.findFirst({
      where: (u, { eq: eqOp }) => eqOp(u.id, order.userId),
    })

    const transaction = await db.query.paymentTransaction.findFirst({
      where: (pt, { eq: eqOp }) => eqOp(pt.id, order.transactionId),
    })

    // Calculate fulfillment deadline
    const defaultDeadlineHours = parseInt(process.env.FULFILLMENT_DEADLINE_HOURS || "12", 10)
    const deadlineHours = order.fulfillmentDeadlineHours || defaultDeadlineHours
    const deadlineDate = order.activatedAt
      ? new Date(order.activatedAt.getTime() + deadlineHours * 60 * 60 * 1000)
      : null
    const isDeadlinePassed = deadlineDate ? new Date() > deadlineDate : false
    const waitingForFanConfirmation = order.status === "fulfilled" && !order.customerFulfilledAt

    const orderDetails = {
      id: order.id,
      serviceId: order.serviceId,
      serviceName: serviceRecord?.name || "Unknown Service",
      serviceDescription: serviceRecord?.description || "",
      serviceType: serviceRecord?.serviceType || "shoutout",
      userId: order.userId,
      userName: customer?.name || "Unknown User",
      userEmail: customer?.email || "",
      status: order.status,
      fulfillmentNotes: order.fulfillmentNotes,
      activatedAt: order.activatedAt?.toISOString() || null,
      utilizedAt: order.utilizedAt?.toISOString() || null,
      customerJoinedAt: order.customerJoinedAt?.toISOString() || null,
      creatorJoinedAt: order.creatorJoinedAt?.toISOString() || null,
      customerFulfilledAt: order.customerFulfilledAt?.toISOString() || null,
      deadlineDate: deadlineDate?.toISOString() || null,
      isDeadlinePassed,
      waitingForFanConfirmation,
      amount: transaction?.amount ? transaction.amount / 100 : 0,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    }

    return NextResponse.json(orderDetails)
  } catch (error) {
    console.error("Error fetching order details:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

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

    // If fulfilling, validate based on service type
    if (status === "fulfilled") {
      const serviceRecord = await db.query.service.findFirst({
        where: (s, { eq: eqOp }) => eqOp(s.id, order.serviceId),
      });

      if (serviceRecord) {
        const serviceType = serviceRecord.serviceType;
        
        // For chat services, both parties must have participated
        if (serviceType === "chat") {
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
        // For other service types (shoutout, custom_video, custom_photo, etc.), 
        // no participation validation needed - creator can mark as fulfilled directly
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

