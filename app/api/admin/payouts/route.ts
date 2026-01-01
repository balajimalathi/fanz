import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/client"
import { payout, creator } from "@/lib/db/schema"
import { eq, desc, and, inArray } from "drizzle-orm"
import { PayoutService } from "@/lib/payments/payout-service"

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const creatorId = searchParams.get("creatorId")
    const status = searchParams.get("status")

    let whereConditions = []

    if (creatorId) {
      whereConditions.push(eq(payout.creatorId, creatorId))
    }

    if (status) {
      whereConditions.push(eq(payout.status, status as any))
    }

    const payouts = await db
      .select()
      .from(payout)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(payout.createdAt))

    // Get creator details
    const creatorIds = [...new Set(payouts.map((p) => p.creatorId))]
    const creators = creatorIds.length > 0
      ? await db.query.creator.findMany({
          where: (c, { inArray: inArrayOp }) => inArrayOp(c.id, creatorIds),
        })
      : []

    const creatorMap = new Map(creators.map((c) => [c.id, c]))

    const payoutsWithDetails = payouts.map((p) => {
      const creatorRecord = creatorMap.get(p.creatorId)
      return {
        id: p.id,
        creatorId: p.creatorId,
        creatorName: creatorRecord?.displayName || "Unknown",
        creatorUsername: creatorRecord?.username || null,
        periodStart: p.periodStart.toISOString(),
        periodEnd: p.periodEnd.toISOString(),
        totalAmount: p.totalAmount / 100,
        platformFee: p.platformFee / 100,
        netAmount: p.netAmount / 100,
        status: p.status,
        processedAt: p.processedAt?.toISOString() || null,
        createdAt: p.createdAt.toISOString(),
      }
    })

    return NextResponse.json({ payouts: payoutsWithDetails })
  } catch (error) {
    console.error("Error fetching payouts:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

