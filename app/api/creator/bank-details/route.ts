import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { bankDetailsSchema } from "@/lib/validations/creator"
import { PayoutService } from "@/lib/payments/payout-service"

/**
 * @summary Get bank details
 * @description Retrieves the bank details for the authenticated creator.
 * @tags Creator, Payments
 * @security BearerAuth
 * @returns {object} 200 - Bank details
 * @returns {object} 401 - Unauthorized
 * @returns {object} 500 - Internal server error
 */
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

/**
 * @summary Update bank details
 * @description Updates the bank details for the authenticated creator.
 * @tags Creator, Payments
 * @security BearerAuth
 * @param {object} request.body.required - The bank details
 * @property {string} pan - PAN number
 * @property {string} accountNumber - Bank account number
 * @property {string} ifscCode - IFSC Code
 * @property {string} bankName - Name of the bank
 * @property {string} accountHolderName - Name of the account holder
 * @property {string} [branchName] - Branch name
 * @property {string} [accountType] - Account type
 * @returns {object} 200 - Success
 * @returns {object} 400 - Validation failed
 * @returns {object} 401 - Unauthorized
 * @returns {object} 500 - Internal server error
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    // Validate input with Zod
    const validationResult = bankDetailsSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    const {
      pan,
      accountNumber,
      ifscCode,
      bankName,
      accountHolderName,
      branchName,
      accountType,
    } = validationResult.data

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

