import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/client"
import { serviceOrder, service, user, paymentTransaction, creator } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { DEFAULT_CURRENCY } from "@/lib/currency/currency-config"

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

    const creatorRecord = await db.query.creator.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, order.creatorId),
      columns: { currency: true },
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
      customerDescription: order.customerDescription || null,
      fulfillmentNotes: order.fulfillmentNotes,
      fulfillmentMediaUrl: order.fulfillmentMediaUrl || null,
      activatedAt: order.activatedAt?.toISOString() || null,
      utilizedAt: order.utilizedAt?.toISOString() || null,
      customerJoinedAt: order.customerJoinedAt?.toISOString() || null,
      creatorJoinedAt: order.creatorJoinedAt?.toISOString() || null,
      customerFulfilledAt: order.customerFulfilledAt?.toISOString() || null,
      creatorFulfilledAt: order.creatorFulfilledAt?.toISOString() || null,
      deadlineDate: deadlineDate?.toISOString() || null,
      isDeadlinePassed,
      waitingForFanConfirmation,
      amount: transaction?.amount ?? 0,
      currency: creatorRecord?.currency ?? DEFAULT_CURRENCY,
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

    // If fulfilling, validate based on service type and deadline
    if (status === "fulfilled") {
      // Check if deadline has passed (creator cannot fulfill after deadline)
      if (order.activatedAt) {
        const defaultDeadlineHours = parseInt(process.env.FULFILLMENT_DEADLINE_HOURS || "12", 10)
        const deadlineHours = order.fulfillmentDeadlineHours || defaultDeadlineHours
        const deadlineDate = new Date(order.activatedAt.getTime() + deadlineHours * 60 * 60 * 1000)
        
        if (new Date() > deadlineDate) {
          return NextResponse.json(
            { 
              error: "Cannot fulfill order after deadline has passed. The order is eligible for refund.",
              deadlineDate: deadlineDate.toISOString(),
            },
            { status: 400 }
          );
        }
      }

      const serviceRecord = await db.query.service.findFirst({
        where: (s, { eq: eqOp }) => eqOp(s.id, order.serviceId),
      });

      if (serviceRecord) {
        const serviceType = serviceRecord.serviceType;
        
        // For custom_video and custom_photo, require fulfillment media file
        if (serviceType === "custom_video" || serviceType === "custom_photo") {
          if (!order.fulfillmentMediaUrl) {
            return NextResponse.json(
              { 
                error: `Fulfillment file is required for ${serviceType === "custom_video" ? "custom video" : "custom photo"} services. Please upload the file before marking as fulfilled.`,
              },
              { status: 400 }
            );
          }
        }
        // For other service types (shoutout, product_review, etc.), 
        // no file validation needed - creator can mark as fulfilled directly
      }
    }

    // Update order
    const updateData: any = {
      status: status as "pending" | "active" | "fulfilled" | "cancelled",
      fulfillmentNotes: fulfillmentNotes || null,
      updatedAt: new Date(),
    };

    // Set creatorFulfilledAt when marking as fulfilled
    if (status === "fulfilled" && order.status !== "fulfilled") {
      updateData.creatorFulfilledAt = new Date();
    }

    await db
      .update(serviceOrder)
      .set(updateData)
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

