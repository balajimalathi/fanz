import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/client"
import { creator } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

import { payoutSettingsSchema } from "@/lib/validations/creator"

// GET - Fetch payout settings
/**
 * @summary Get payout settings
 * @description Retrieves the payout settings for the authenticated creator.
 * @tags Creator, Payments
 * @security BearerAuth
 * @returns {object} 200 - Payout settings
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

    const payoutSettings = creatorRecord.payoutSettings || {
      minimumThreshold: 1000, // Default 1000 rupees
      automaticPayout: false,
    }

    return NextResponse.json({ payoutSettings })
  } catch (error) {
    console.error("Error fetching payout settings:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - Update payout settings
/**
 * @summary Update payout settings
 * @description Updates the payout settings for the authenticated creator.
 * @tags Creator, Payments
 * @security BearerAuth
 * @param {object} request.body.required - Payout settings
 * @property {number} [minimumThreshold] - Minimum payout threshold in rupees
 * @property {boolean} [automaticPayout] - Enable automatic payouts
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
    const validationResult = payoutSettingsSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    const { minimumThreshold, automaticPayout } = validationResult.data

    const creatorRecord = await db.query.creator.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, session.user.id),
    })

    if (!creatorRecord) {
      return NextResponse.json({ error: "Creator not found" }, { status: 404 })
    }

    const existingSettings = creatorRecord.payoutSettings || {}
    const updatedSettings = {
      ...existingSettings,
      ...(minimumThreshold !== undefined && { minimumThreshold }),
      ...(automaticPayout !== undefined && { automaticPayout }),
    }

    await db
      .update(creator)
      .set({
        payoutSettings: updatedSettings,
        updatedAt: new Date(),
      })
      .where(eq(creator.id, session.user.id))

    return NextResponse.json({ success: true, payoutSettings: updatedSettings })
  } catch (error) {
    console.error("Error updating payout settings:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

