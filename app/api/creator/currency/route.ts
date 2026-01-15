import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/client"
import { creator } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { creatorCurrencySchema } from "@/lib/validations/creator"

// GET - Fetch currency settings
/**
 * @summary Get currency settings
 * @description Retrieves the currency setting for the authenticated creator.
 * @tags Creator, Settings
 * @security BearerAuth
 * @returns {object} 200 - Currency settings
 * @returns {object} 401 - Unauthorized
 * @returns {object} 404 - Creator not found
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

    const creatorRecord = await db.query.creator.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, session.user.id),
    })

    if (!creatorRecord) {
      return NextResponse.json({ error: "Creator not found" }, { status: 404 })
    }

    // Use currency fields
    const currency = creatorRecord.currency || 
                     "USD"

    return NextResponse.json({
      currency,
    })
  } catch (error) {
    console.error("Error fetching currency settings:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - Update currency settings
/**
 * @summary Update currency settings
 * @description Updates the currency setting for the authenticated creator.
 * @tags Creator, Settings
 * @security BearerAuth
 * @param {object} request.body.required - Currency settings
 * @property {string} [currency] - Currency for pricing and payouts (ISO 4217 code)
 * @returns {object} 200 - Success with updated settings
 * @returns {object} 400 - Validation failed
 * @returns {object} 401 - Unauthorized
 * @returns {object} 404 - Creator not found
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
    const validationResult = creatorCurrencySchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    const { currency } = validationResult.data

    const creatorRecord = await db.query.creator.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, session.user.id),
    })

    if (!creatorRecord) {
      return NextResponse.json({ error: "Creator not found" }, { status: 404 })
    }

    // For MVP: Prevent currency changes after onboarding
    // Currency can only be set during onboarding
    if (currency !== undefined && creatorRecord.currency && currency !== creatorRecord.currency) {
      return NextResponse.json(
        { error: "Currency cannot be changed after onboarding. This feature will be available in a future update." },
        { status: 400 }
      )
    }

    // Build update data (only allow setting if currency is not already set)
    const updateData: {
      currency?: string
      updatedAt: Date
    } = {
      updatedAt: new Date(),
    }

    // Only allow setting currency if it's not already set (during onboarding)
    if (currency !== undefined && !creatorRecord.currency) {
      updateData.currency = currency
    }

    await db
      .update(creator)
      .set(updateData)
      .where(eq(creator.id, session.user.id))

    // Fetch updated record to return
    const updatedRecord = await db.query.creator.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, session.user.id),
    })

    return NextResponse.json({
      success: true,
      currency: updatedRecord?.currency || "USD",
    })
  } catch (error) {
    console.error("Error updating currency settings:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

