import { NextRequest, NextResponse } from "next/server"
import { checkAdminAccess } from "@/lib/utils/admin-auth"
import { db } from "@/lib/db/client"
import { creator, user } from "@/lib/db/schema"
import { eq, desc, and, or, like, inArray } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const authError = await checkAdminAccess()
    if (authError) return authError

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") // "pending", "approved", "rejected", or null for all
    const search = searchParams.get("search") // Search by username or display name
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

    let whereConditions = []

    // Filter by onboarded status
    if (status === "pending") {
      whereConditions.push(eq(creator.onboarded, false))
    } else if (status === "approved") {
      whereConditions.push(eq(creator.onboarded, true))
    }

    // Search filter
    if (search) {
      whereConditions.push(
        or(
          like(creator.username, `%${search}%`),
          like(creator.displayName, `%${search}%`)
        )!
      )
    }

    const creators = await db
      .select()
      .from(creator)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(creator.createdAt))
      .limit(limit)
      .offset(offset)

    // Get user details for each creator
    const userIds = creators.map((c) => c.id)
    const users = userIds.length > 0
      ? await db.query.user.findMany({
          where: (u, { inArray: inArrayOp }) => inArrayOp(u.id, userIds),
        })
      : []

    const userMap = new Map(users.map((u) => [u.id, u]))

    const creatorsWithDetails = creators.map((c) => {
      const userRecord = userMap.get(c.id)
      return {
        id: c.id,
        username: c.username,
        displayName: c.displayName,
        email: userRecord?.email || "",
        onboarded: c.onboarded,
        creatorType: c.creatorType,
        contentType: c.contentType,
        country: c.country,
        categories: c.categories,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      }
    })

    return NextResponse.json({ creators: creatorsWithDetails })
  } catch (error) {
    console.error("Error fetching creators:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authError = await checkAdminAccess()
    if (authError) return authError

    const body = await request.json()
    const { creatorId, action } = body // action: "approve" or "reject"

    if (!creatorId || !action) {
      return NextResponse.json(
        { error: "creatorId and action are required" },
        { status: 400 }
      )
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "action must be 'approve' or 'reject'" },
        { status: 400 }
      )
    }

    const creatorRecord = await db.query.creator.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, creatorId),
    })

    if (!creatorRecord) {
      return NextResponse.json({ error: "Creator not found" }, { status: 404 })
    }

    // Update creator onboarded status
    await db
      .update(creator)
      .set({
        onboarded: action === "approve",
        updatedAt: new Date(),
      })
      .where(eq(creator.id, creatorId))

    return NextResponse.json({
      success: true,
      message: `Creator ${action === "approve" ? "approved" : "rejected"}`,
    })
  } catch (error) {
    console.error("Error updating creator:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

