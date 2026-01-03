import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { PayoutService } from "@/lib/payments/payout-service"
import { db } from "@/lib/db/client"
import { creator } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get creator record and payout settings
    const creatorRecord = await db.query.creator.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, session.user.id),
    })

    if (!creatorRecord) {
      return NextResponse.json({ error: "Creator not found" }, { status: 404 })
    }

    const payoutSettings = creatorRecord.payoutSettings || {
      minimumThreshold: 1000,
      automaticPayout: false,
    }

    // Check if automatic payout is enabled
    if (payoutSettings.automaticPayout) {
      return NextResponse.json(
        { error: "Automatic payout is enabled. Payouts will be processed automatically." },
        { status: 400 }
      )
    }

    // Get pending payout amount (always in USD for MVP)
    const pendingAmount = await PayoutService.getPendingPayoutAmount(session.user.id)
    const { getCurrencyDecimals, getCurrencySymbol } = await import("@/lib/currency/currency-utils")
    const BASE_CURRENCY = "USD"
    const decimals = getCurrencyDecimals(BASE_CURRENCY)
    const divisor = Math.pow(10, decimals)
    const pendingAmountDisplay = pendingAmount / divisor
    const minimumThreshold = payoutSettings.minimumThreshold || 1000
    const currencySymbol = getCurrencySymbol(BASE_CURRENCY)

    // Check if minimum threshold is met
    if (pendingAmountDisplay < minimumThreshold) {
      return NextResponse.json(
        {
          error: `Minimum threshold of ${currencySymbol}${minimumThreshold} not met. Current pending amount: ${currencySymbol}${pendingAmountDisplay.toFixed(decimals === 0 ? 0 : 2)}`,
        },
        { status: 400 }
      )
    }

    // Check if bank details are present
    const bankDetails = creatorRecord.bankAccountDetails
    if (!bankDetails || !bankDetails.accountNumber || !bankDetails.ifscCode) {
      return NextResponse.json(
        { error: "Bank details are required before requesting a payout" },
        { status: 400 }
      )
    }

    // Request payout
    const result = await PayoutService.requestPayout(session.user.id)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to create payout request" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      payoutId: result.payoutId,
      message: "Payout request created successfully",
    })
  } catch (error) {
    console.error("Error creating payout request:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

