import { NextRequest, NextResponse } from "next/server"
import { checkAdminAccess } from "@/lib/utils/admin-auth"
import { PayoutService } from "@/lib/payments/payout-service"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ payoutId: string }> }
) {
  try {
    const authError = await checkAdminAccess()
    if (authError) return authError

    const { payoutId } = await params
    const body = await request.json()
    const { status } = body

    if (!status || !["pending", "processing", "completed", "failed"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      )
    }

    const success = await PayoutService.updatePayoutStatus(
      payoutId,
      status as "pending" | "processing" | "completed" | "failed"
    )

    if (!success) {
      return NextResponse.json(
        { error: "Failed to update payout status" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error processing payout:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

