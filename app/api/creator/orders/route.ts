import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/client"
import { serviceOrder, service, user, paymentTransaction } from "@/lib/db/schema"
import { eq, and, desc, inArray } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get creator record
    const creatorRecord = await db.query.creator.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, session.user.id),
    })

    if (!creatorRecord) {
      return NextResponse.json({ error: "Creator not found" }, { status: 404 })
    }

    // Get all service orders for this creator
    const orders = await db
      .select()
      .from(serviceOrder)
      .where(eq(serviceOrder.creatorId, session.user.id))
      .orderBy(desc(serviceOrder.createdAt))

    // Get related data
    const orderIds = orders.map((o) => o.id)
    const serviceIds = orders.map((o) => o.serviceId)
    const transactionIds = orders.map((o) => o.transactionId)
    const userIds = orders.map((o) => o.userId)

    const services = await db.query.service.findMany({
      where: (s, { inArray: inArrayOp }) => inArrayOp(s.id, serviceIds),
    })

    const transactions = await db.query.paymentTransaction.findMany({
      where: (pt, { inArray: inArrayOp }) => inArrayOp(pt.id, transactionIds),
    })

    const users = await db.query.user.findMany({
      where: (u, { inArray: inArrayOp }) => inArrayOp(u.id, userIds),
    })

    const serviceMap = new Map(services.map((s) => [s.id, s]))
    const transactionMap = new Map(transactions.map((t) => [t.id, t]))
    const userMap = new Map(users.map((u) => [u.id, u]))

    const ordersWithDetails = orders.map((order) => {
      const service = serviceMap.get(order.serviceId)
      const transaction = transactionMap.get(order.transactionId)
      const user = userMap.get(order.userId)

      return {
        id: order.id,
        serviceId: order.serviceId,
        serviceName: service?.name || "Unknown Service",
        serviceDescription: service?.description || "",
        serviceType: service?.serviceType || "shoutout",
        userId: order.userId,
        userName: user?.name || "Unknown User",
        userEmail: user?.email || "",
        status: order.status,
        fulfillmentNotes: order.fulfillmentNotes,
        activatedAt: order.activatedAt?.toISOString() || null,
        utilizedAt: order.utilizedAt?.toISOString() || null,
        customerJoinedAt: order.customerJoinedAt?.toISOString() || null,
        creatorJoinedAt: order.creatorJoinedAt?.toISOString() || null,
        amount: transaction?.amount ? transaction.amount / 100 : 0,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
      }
    })

    return NextResponse.json({ orders: ordersWithDetails })
  } catch (error) {
    console.error("Error fetching service orders:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

