import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/client"
import { membership } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { updateMembershipSchema } from "@/lib/validations/membership"

// GET - Fetch a specific membership
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params

    // Fetch the membership and verify ownership
    const membershipRecord = await db.query.membership.findFirst({
      where: (m, { eq: eqOp, and: andOp }) =>
        andOp(eqOp(m.id, id), eqOp(m.creatorId, session.user.id)),
    })

    if (!membershipRecord) {
      return NextResponse.json(
        { error: "Membership not found" },
        { status: 404 }
      )
    }

    // Convert monthlyRecurringFee from paise to rupees
    const membershipWithRupees = {
      ...membershipRecord,
      monthlyRecurringFee: membershipRecord.monthlyRecurringFee / 100,
    }

    return NextResponse.json(membershipWithRupees)
  } catch (error) {
    console.error("Error fetching membership:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PATCH - Update a membership
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params
    const body = await request.json()

    // Validate input with Zod
    const validationResult = updateMembershipSchema.safeParse({ ...body, id })
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    // Check if membership exists and belongs to the creator
    const existingMembership = await db.query.membership.findFirst({
      where: (m, { eq: eqOp, and: andOp }) =>
        andOp(eqOp(m.id, id), eqOp(m.creatorId, session.user.id)),
    })

    if (!existingMembership) {
      return NextResponse.json(
        { error: "Membership not found" },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: {
      title?: string
      description?: string
      monthlyRecurringFee?: number
      visible?: boolean
      updatedAt?: Date
    } = {
      updatedAt: new Date(),
    }

    if (validationResult.data.title !== undefined) {
      updateData.title = validationResult.data.title
    }
    if (validationResult.data.description !== undefined) {
      updateData.description = validationResult.data.description
    }
    if (validationResult.data.monthlyRecurringFee !== undefined) {
      // Convert monthlyRecurringFee from rupees to paise
      updateData.monthlyRecurringFee = Math.round(validationResult.data.monthlyRecurringFee * 100)
    }
    if (validationResult.data.visible !== undefined) {
      updateData.visible = validationResult.data.visible
    }

    // Update the membership
    const [updatedMembership] = await db
      .update(membership)
      .set(updateData)
      .where(eq(membership.id, id))
      .returning()

    // Convert monthlyRecurringFee back to rupees
    const membershipWithRupees = {
      ...updatedMembership,
      monthlyRecurringFee: updatedMembership.monthlyRecurringFee / 100,
    }

    return NextResponse.json(membershipWithRupees)
  } catch (error) {
    console.error("Error updating membership:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE - Delete a membership
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params

    // Check if membership exists and belongs to the creator
    const existingMembership = await db.query.membership.findFirst({
      where: (m, { eq: eqOp, and: andOp }) =>
        andOp(eqOp(m.id, id), eqOp(m.creatorId, session.user.id)),
    })

    if (!existingMembership) {
      return NextResponse.json(
        { error: "Membership not found" },
        { status: 404 }
      )
    }

    // Delete the membership
    await db.delete(membership).where(eq(membership.id, id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting membership:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

