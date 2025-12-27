import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { PayoutService } from "@/lib/payments/payout-service"

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const pendingAmount = await PayoutService.getPendingPayoutAmount(session.user.id)

    return NextResponse.json({
      pendingAmount: pendingAmount / 100, // Convert paise to rupees
    })
  } catch (error) {
    console.error("Error fetching pending payout:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

