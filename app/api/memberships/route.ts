import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/client"
import { membership } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { createMembershipSchema } from "@/lib/validations/membership"

// GET - Fetch all memberships for the authenticated creator
/**
 * @summary Get memberships
 * @description Retrieves all membership tiers created by the authenticated creator.
 * @tags Memberships
 * @security BearerAuth
 * @returns {object} 200 - List of memberships
 * @returns {object} 401 - Unauthorized
 * @returns {object} 403 - Forbidden
 * @returns {object} 500 - Internal server error
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Check if user has creator role
    if (session.user.role !== "creator") {
      return NextResponse.json(
        { error: "Forbidden: Creator role required" },
        { status: 403 }
      )
    }

    // Fetch all memberships for this creator
    const memberships = await db.query.membership.findMany({
      where: (m, { eq: eqOp }) => eqOp(m.creatorId, session.user.id),
      orderBy: (m, { desc }) => [desc(m.createdAt)],
    })

    // Convert monthlyRecurringFee from paise to rupees for response
    const membershipsWithRupees = memberships.map((m) => ({
      ...m,
      monthlyRecurringFee: m.monthlyRecurringFee / 100, // Convert paise to rupees
    }))

    return NextResponse.json(membershipsWithRupees)
  } catch (error) {
    console.error("Error fetching memberships:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - Create a new membership
/**
 * @summary Create membership
 * @description Creates a new membership tier.
 * @tags Memberships
 * @security BearerAuth
 * @param {object} request.body.required - Membership creation data
 * @property {string} title - Membership title
 * @property {string} description - Membership description
 * @property {number} monthlyRecurringFee - Monthly fee in rupees (valid values: 99, 199, 299, 499, 999, 1499, 1999, 2999, 4999)
 * @property {boolean} [visible] - Visibility status
 * @returns {object} 201 - Created membership
 * @returns {object} 400 - Validation failed
 * @returns {object} 401 - Unauthorized
 * @returns {object} 403 - Forbidden
 * @returns {object} 500 - Internal server error
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Check if user has creator role
    if (session.user.role !== "creator") {
      return NextResponse.json(
        { error: "Forbidden: Creator role required" },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Validate input with Zod
    const validationResult = createMembershipSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    const { title, description, monthlyRecurringFee, visible } = validationResult.data

    // Convert monthlyRecurringFee from rupees to paise (store in smallest currency unit)
    const feeInPaise = Math.round(monthlyRecurringFee * 100)

    // Create the membership
    const [newMembership] = await db
      .insert(membership)
      .values({
        creatorId: session.user.id,
        title,
        description,
        monthlyRecurringFee: feeInPaise,
        visible: visible ?? true,
      })
      .returning()

    // Convert monthlyRecurringFee back to rupees for response
    const membershipWithRupees = {
      ...newMembership,
      monthlyRecurringFee: newMembership.monthlyRecurringFee / 100,
    }

    return NextResponse.json(membershipWithRupees, { status: 201 })
  } catch (error) {
    console.error("Error creating membership:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

