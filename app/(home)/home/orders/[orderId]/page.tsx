import { redirect, notFound } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/client"
import { creator, serviceOrder, service, user, paymentTransaction } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { DEFAULT_CURRENCY } from "@/lib/currency/currency-config"
import { CreatorOrderDetail } from "@/components/orders/creator-order-detail"

export const dynamic = "force-dynamic"

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect("/login")
  }

  // Verify user is a creator
  const creatorRecord = await db.query.creator.findFirst({
    where: (c, { eq: eqOp }) => eqOp(c.id, session.user.id),
  })

  if (!creatorRecord) {
    redirect("/")
  }

  const { orderId } = await params

  // Fetch order data directly from database
  try {
    const order = await db.query.serviceOrder.findFirst({
      where: (so, { eq: eqOp }) => eqOp(so.id, orderId),
    })

    if (!order) {
      notFound()
    }

    if (order.creatorId !== session.user.id) {
      redirect("/home/orders")
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
      customerDescription: order.customerDescription || null,
      fulfillmentNotes: order.fulfillmentNotes,
      fulfillmentMediaUrl: order.fulfillmentMediaUrl || null,
      activatedAt: order.activatedAt?.toISOString() || null,
      utilizedAt: order.utilizedAt?.toISOString() || null,
      customerJoinedAt: order.customerJoinedAt?.toISOString() || null,
      creatorJoinedAt: order.creatorJoinedAt?.toISOString() || null,
      customerFulfilledAt: order.customerFulfilledAt?.toISOString() || null,
      deadlineDate: deadlineDate?.toISOString() || null,
      isDeadlinePassed,
      waitingForFanConfirmation,
      amount: transaction?.amount ?? 0,
      currency: creatorRecord.currency ?? DEFAULT_CURRENCY,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    }

    return (
      <div className="p-4 md:p-6 space-y-6">
        <CreatorOrderDetail initialOrder={orderDetails} />
      </div>
    )
  } catch (error) {
    console.error("Error fetching order:", error)
    notFound()
  }
}
