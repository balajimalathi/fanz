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

    const bankDetails = await PayoutService.getCreatorBankDetails(session.user.id)

    return NextResponse.json({ bankDetails })
  } catch (error) {
    console.error("Error fetching bank details:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      pan,
      accountNumber,
      ifscCode,
      bankName,
      accountHolderName,
      branchName,
      accountType,
    } = body

    if (!pan || !accountNumber || !ifscCode || !bankName || !accountHolderName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const success = await PayoutService.updateCreatorBankDetails(session.user.id, {
      pan,
      accountNumber,
      ifscCode,
      bankName,
      accountHolderName,
      branchName,
      accountType,
    })

    if (!success) {
      return NextResponse.json(
        { error: "Failed to update bank details" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating bank details:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

