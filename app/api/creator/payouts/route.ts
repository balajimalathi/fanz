import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/client"
import { payout } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { PayoutService } from "@/lib/payments/payout-service"

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all payouts for this creator
    const payouts = await db
      .select()
      .from(payout)
      .where(eq(payout.creatorId, session.user.id))
      .orderBy((p, { desc }) => [desc(p.createdAt)])

    const payoutsWithRupees = payouts.map((p) => ({
      id: p.id,
      periodStart: p.periodStart.toISOString(),
      periodEnd: p.periodEnd.toISOString(),
      totalAmount: p.totalAmount / 100, // Convert paise to rupees
      platformFee: p.platformFee / 100,
      netAmount: p.netAmount / 100,
      status: p.status,
      processedAt: p.processedAt?.toISOString() || null,
      createdAt: p.createdAt.toISOString(),
    }))

    // Get pending payout amount
    const pendingAmount = await PayoutService.getPendingPayoutAmount(session.user.id)

    return NextResponse.json({
      payouts: payoutsWithRupees,
      pendingAmount: pendingAmount / 100, // Convert paise to rupees
    })
  } catch (error) {
    console.error("Error fetching payouts:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

