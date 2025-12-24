import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/client"
import { service } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { updateServiceSchema } from "@/lib/validations/service"

// GET - Fetch a specific service
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

    // Fetch the service and verify ownership
    const serviceRecord = await db.query.service.findFirst({
      where: (s, { eq: eqOp, and: andOp }) =>
        andOp(eqOp(s.id, id), eqOp(s.creatorId, session.user.id)),
    })

    if (!serviceRecord) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 }
      )
    }

    // Convert price from paise to rupees
    const serviceWithRupees = {
      ...serviceRecord,
      price: serviceRecord.price / 100,
    }

    return NextResponse.json(serviceWithRupees)
  } catch (error) {
    console.error("Error fetching service:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PATCH - Update a service
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
    const validationResult = updateServiceSchema.safeParse({ ...body, id })
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    // Check if service exists and belongs to the creator
    const existingService = await db.query.service.findFirst({
      where: (s, { eq: eqOp, and: andOp }) =>
        andOp(eqOp(s.id, id), eqOp(s.creatorId, session.user.id)),
    })

    if (!existingService) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: {
      name?: string
      description?: string
      price?: number
      visible?: boolean
      updatedAt?: Date
    } = {
      updatedAt: new Date(),
    }

    if (validationResult.data.name !== undefined) {
      updateData.name = validationResult.data.name
    }
    if (validationResult.data.description !== undefined) {
      updateData.description = validationResult.data.description
    }
    if (validationResult.data.price !== undefined) {
      // Convert price from rupees to paise
      updateData.price = Math.round(validationResult.data.price * 100)
    }
    if (validationResult.data.visible !== undefined) {
      updateData.visible = validationResult.data.visible
    }

    // Update the service
    const [updatedService] = await db
      .update(service)
      .set(updateData)
      .where(eq(service.id, id))
      .returning()

    // Convert price back to rupees
    const serviceWithRupees = {
      ...updatedService,
      price: updatedService.price / 100,
    }

    return NextResponse.json(serviceWithRupees)
  } catch (error) {
    console.error("Error updating service:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE - Delete a service
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

    // Check if service exists and belongs to the creator
    const existingService = await db.query.service.findFirst({
      where: (s, { eq: eqOp, and: andOp }) =>
        andOp(eqOp(s.id, id), eqOp(s.creatorId, session.user.id)),
    })

    if (!existingService) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 }
      )
    }

    // Delete the service
    await db.delete(service).where(eq(service.id, id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting service:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

