import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/client"
import { payout, payoutItem, creator } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { PayoutService } from "@/lib/payments/payout-service"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ payoutId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // TODO: Add admin role check
    // if (session.user.role !== "admin") {
    //   return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    // }

    const { payoutId } = await params

    const payoutRecord = await db.query.payout.findFirst({
      where: (p, { eq: eqOp }) => eqOp(p.id, payoutId),
    })

    if (!payoutRecord) {
      return NextResponse.json({ error: "Payout not found" }, { status: 404 })
    }

    // Get payout items
    const items = await db.query.payoutItem.findMany({
      where: (pi, { eq: eqOp }) => eqOp(pi.payoutId, payoutId),
    })

    // Get creator details
    const creatorRecord = await db.query.creator.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, payoutRecord.creatorId),
    })

    // Get bank details
    const bankDetails = await PayoutService.getCreatorBankDetails(payoutRecord.creatorId)

    return NextResponse.json({
      id: payoutRecord.id,
      creatorId: payoutRecord.creatorId,
      creatorName: creatorRecord?.displayName || "Unknown",
      creatorUsername: creatorRecord?.username || null,
      periodStart: payoutRecord.periodStart.toISOString(),
      periodEnd: payoutRecord.periodEnd.toISOString(),
      totalAmount: payoutRecord.totalAmount / 100,
      platformFee: payoutRecord.platformFee / 100,
      netAmount: payoutRecord.netAmount / 100,
      status: payoutRecord.status,
      processedAt: payoutRecord.processedAt?.toISOString() || null,
      createdAt: payoutRecord.createdAt.toISOString(),
      items: items.map((item) => ({
        id: item.id,
        transactionId: item.transactionId,
        amount: item.amount / 100,
      })),
      bankDetails,
    })
  } catch (error) {
    console.error("Error fetching payout details:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

