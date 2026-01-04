import { NextRequest, NextResponse } from "next/server"
import { checkAdminAccess } from "@/lib/utils/admin-auth"
import { PayoutService } from "@/lib/payments/payout-service"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ creatorId: string }> }
) {
  try {
    const authError = await checkAdminAccess()
    if (authError) return authError

    const { creatorId } = await params

    const bankDetails = await PayoutService.getCreatorBankDetails(creatorId)

    return NextResponse.json({ bankDetails })
  } catch (error) {
    console.error("Error fetching bank details:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

