import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/client"
import { serviceOrder } from "@/lib/db/schema"
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

    if (!status || !["pending", "fulfilled", "cancelled"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be pending, fulfilled, or cancelled" },
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

    // Update order
    await db
      .update(serviceOrder)
      .set({
        status: status as "pending" | "fulfilled" | "cancelled",
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

