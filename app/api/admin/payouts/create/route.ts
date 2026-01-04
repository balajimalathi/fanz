import { NextRequest, NextResponse } from "next/server"
import { checkAdminAccess } from "@/lib/utils/admin-auth"
import { PayoutService } from "@/lib/payments/payout-service"

export async function POST(request: NextRequest) {
  try {
    const authError = await checkAdminAccess()
    if (authError) return authError

    const body = await request.json()
    const { creatorId, periodStart, periodEnd } = body

    if (!creatorId || !periodStart || !periodEnd) {
      return NextResponse.json(
        { error: "creatorId, periodStart, and periodEnd are required" },
        { status: 400 }
      )
    }

    const result = await PayoutService.createPayout({
      creatorId,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ payoutId: result.payoutId })
  } catch (error) {
    console.error("Error creating payout:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

