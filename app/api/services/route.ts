import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/client"
import { service } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { createServiceSchema, updateServiceSchema } from "@/lib/validations/service"

// GET - Fetch all services for the authenticated creator
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

    // Fetch all services for this creator
    const services = await db.query.service.findMany({
      where: (s, { eq: eqOp }) => eqOp(s.creatorId, session.user.id),
      orderBy: (s, { desc }) => [desc(s.createdAt)],
    })

    // Convert price from paise to rupees for response
    const servicesWithRupees = services.map((s) => ({
      ...s,
      price: s.price / 100, // Convert paise to rupees
    }))

    return NextResponse.json(servicesWithRupees)
  } catch (error) {
    console.error("Error fetching services:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - Create a new service
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
    const validationResult = createServiceSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: "Validation failed",
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    const { name, description, price, serviceType, duration, visible } = validationResult.data

    // Convert price from rupees to paise (store in smallest currency unit)
    const priceInPaise = Math.round(price * 100)

    // Create the service
    const [newService] = await db
      .insert(service)
      .values({
        creatorId: session.user.id,
        name,
        description,
        price: priceInPaise,
        serviceType,
        duration: duration ?? null,
        visible: visible ?? true,
      })
      .returning()

    // Convert price back to rupees for response
    const serviceWithRupees = {
      ...newService,
      price: newService.price / 100,
    }

    return NextResponse.json(serviceWithRupees, { status: 201 })
  } catch (error) {
    console.error("Error creating service:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

