import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/client"
import { serviceOrder, service, notification, user } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { fulfillOrderSchema } from "@/lib/validations/order"

// POST - Mark order as fulfilled by fan
export async function POST(
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

    // Validate input
    const validationResult = fulfillOrderSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    // Get order and verify it belongs to this fan
    const order = await db.query.serviceOrder.findFirst({
      where: (so, { eq: eqOp }) => eqOp(so.id, orderId),
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    if (order.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Verify order is in fulfilled status (creator has marked it as fulfilled)
    if (order.status !== "fulfilled") {
      return NextResponse.json(
        { error: "Order must be marked as fulfilled by creator before fan can confirm" },
        { status: 400 }
      )
    }

    // Check if already fulfilled by fan
    if (order.customerFulfilledAt) {
      return NextResponse.json(
        { error: "Order has already been confirmed by fan" },
        { status: 400 }
      )
    }

    // Get service to check service type
    const serviceRecord = await db.query.service.findFirst({
      where: (s, { eq: eqOp }) => eqOp(s.id, order.serviceId),
    })

    const serviceType = serviceRecord?.serviceType
    const isVideoOrPhoto = serviceType === "custom_video" || serviceType === "custom_photo"

    // Check fulfillment deadline (skip for video/photo services - they can confirm anytime by viewing)
    if (!isVideoOrPhoto) {
      const defaultDeadlineHours = parseInt(process.env.FULFILLMENT_DEADLINE_HOURS || "12", 10)
      const deadlineHours = order.fulfillmentDeadlineHours || defaultDeadlineHours

      if (!order.activatedAt) {
        return NextResponse.json(
          { error: "Order has not been activated yet" },
          { status: 400 }
        )
      }

      const deadlineDate = new Date(order.activatedAt.getTime() + deadlineHours * 60 * 60 * 1000)
      const now = new Date()

      if (now > deadlineDate) {
        return NextResponse.json(
          {
            error: "Fulfillment deadline has passed",
            deadlineDate: deadlineDate.toISOString(),
          },
          { status: 400 }
        )
      }
    }

    // Update order with fan fulfillment confirmation
    await db
      .update(serviceOrder)
      .set({
        customerFulfilledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(serviceOrder.id, orderId))

    // Get fan details for notification
    const fanUser = await db.query.user.findFirst({
      where: (u, { eq: eqOp }) => eqOp(u.id, session.user.id),
    })

    // Send notification to creator
    if (serviceRecord) {
      await db.insert(notification).values({
        userId: order.creatorId,
        type: "service_order_fulfilled",
        title: "Service Order Confirmed",
        message: `${fanUser?.name || "A fan"} has confirmed fulfillment of "${serviceRecord.name}"`,
        link: `/home/orders/${order.id}`,
        read: false,
      })
    }

    return NextResponse.json({
      success: true,
      message: "Order fulfillment confirmed successfully",
    })
  } catch (error) {
    console.error("Error confirming order fulfillment:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
