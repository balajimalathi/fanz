import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/client"
import { serviceOrder, service, creator, user, paymentTransaction } from "@/lib/db/schema"
import { eq, desc, inArray, and } from "drizzle-orm"

// GET - Fetch all service orders for the authenticated fan
// Optional query parameter: creatorId - filter orders by specific creator
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get optional creatorId from query params
    const { searchParams } = new URL(request.url)
    const creatorId = searchParams.get("creatorId")

    // Build where condition - filter by userId and optionally by creatorId
    const whereCondition = creatorId
      ? and(eq(serviceOrder.userId, session.user.id), eq(serviceOrder.creatorId, creatorId))
      : eq(serviceOrder.userId, session.user.id)

    // Get service orders for this fan (optionally filtered by creator)
    const orders = await db
      .select()
      .from(serviceOrder)
      .where(whereCondition)
      .orderBy(desc(serviceOrder.createdAt))

    // Get related data
    const serviceIds = orders.map((o) => o.serviceId)
    const creatorIds = orders.map((o) => o.creatorId)
    const transactionIds = orders.map((o) => o.transactionId)

    const services = await db.query.service.findMany({
      where: (s, { inArray: inArrayOp }) => inArrayOp(s.id, serviceIds),
    })

    const creators = await db.query.creator.findMany({
      where: (c, { inArray: inArrayOp }) => inArrayOp(c.id, creatorIds),
    })

    const transactions = await db.query.paymentTransaction.findMany({
      where: (pt, { inArray: inArrayOp }) => inArrayOp(pt.id, transactionIds),
    })

    const serviceMap = new Map(services.map((s) => [s.id, s]))
    const creatorMap = new Map(creators.map((c) => [c.id, c]))
    const transactionMap = new Map(transactions.map((t) => [t.id, t]))

    // Calculate fulfillment deadline for each order
    const defaultDeadlineHours = parseInt(process.env.FULFILLMENT_DEADLINE_HOURS || "12", 10)

    const ordersWithDetails = orders.map((order) => {
      const service = serviceMap.get(order.serviceId)
      const creator = creatorMap.get(order.creatorId)
      const transaction = transactionMap.get(order.transactionId)

      // Calculate deadline
      const deadlineHours = order.fulfillmentDeadlineHours || defaultDeadlineHours
      const deadlineDate = order.activatedAt
        ? new Date(order.activatedAt.getTime() + deadlineHours * 60 * 60 * 1000)
        : null
      const isDeadlinePassed = deadlineDate ? new Date() > deadlineDate : false
      const canFulfill = order.status === "fulfilled" && !order.customerFulfilledAt && !isDeadlinePassed

      return {
        id: order.id,
        serviceId: order.serviceId,
        serviceName: service?.name || "Unknown Service",
        serviceDescription: service?.description || "",
        serviceType: service?.serviceType || "shoutout",
        creatorId: order.creatorId,
        creatorName: creator?.displayName || "Unknown Creator",
        creatorUsername: creator?.username || "",
        creatorImage: creator?.profileImageUrl || null,
        status: order.status,
        fulfillmentNotes: order.fulfillmentNotes,
        fulfillmentMediaUrl: order.fulfillmentMediaUrl || null,
        customerFulfilledAt: order.customerFulfilledAt?.toISOString() || null,
        creatorFulfilledAt: order.creatorFulfilledAt?.toISOString() || null,
        activatedAt: order.activatedAt?.toISOString() || null,
        deadlineDate: deadlineDate?.toISOString() || null,
        isDeadlinePassed,
        canFulfill,
        amount: transaction?.amount ? transaction.amount / 100 : 0,
        currency: creator?.currency || "USD",
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
      }
    })

    return NextResponse.json({ orders: ordersWithDetails })
  } catch (error) {
    console.error("Error fetching fan service orders:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
