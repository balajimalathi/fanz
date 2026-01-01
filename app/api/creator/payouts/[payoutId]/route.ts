import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/client"
import { payout, payoutItem } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

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

    const { payoutId } = await params

    const payoutRecord = await db.query.payout.findFirst({
      where: (p, { eq: eqOp }) => eqOp(p.id, payoutId),
    })

    if (!payoutRecord) {
      return NextResponse.json({ error: "Payout not found" }, { status: 404 })
    }

    // Verify payout belongs to authenticated creator
    if (payoutRecord.creatorId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get payout items
    const items = await db.query.payoutItem.findMany({
      where: (pi, { eq: eqOp }) => eqOp(pi.payoutId, payoutId),
    })

    return NextResponse.json({
      id: payoutRecord.id,
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
    })
  } catch (error) {
    console.error("Error fetching payout details:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

