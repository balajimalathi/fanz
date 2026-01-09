import { NextRequest, NextResponse } from "next/server"
import { checkAdminAccess } from "@/lib/utils/admin-auth"
import { db } from "@/lib/db/client"
import { creator, user } from "@/lib/db/schema"
import { eq, desc, asc, and, or, like, inArray, count } from "drizzle-orm"
import { AdminListResponse } from "@/types/admin-table"

export async function GET(request: NextRequest) {
  try {
    const authError = await checkAdminAccess()
    if (authError) return authError

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") // Comma-separated: "pending", "approved", or null for all
    const search = searchParams.get("search") // Search by username or display name
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "10")
    const sortBy = searchParams.get("sortBy") || "createdAt"
    const sortOrder = searchParams.get("sortOrder") || "desc"
    
    const limit = pageSize
    const offset = (page - 1) * pageSize

    let whereConditions = []

    // Filter by onboarded status (handle comma-separated values)
    if (status) {
      const statuses = status.split(",").filter(Boolean)
      if (statuses.includes("pending") && statuses.includes("approved")) {
        // Both selected, no filter needed
      } else if (statuses.includes("pending")) {
        whereConditions.push(eq(creator.onboarded, false))
      } else if (statuses.includes("approved")) {
        whereConditions.push(eq(creator.onboarded, true))
      }
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

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined

    // Get total count
    const [{ totalCount }] = await db
      .select({ totalCount: count() })
      .from(creator)
      .where(whereClause)

    // Determine sort order
    const orderByClause = sortOrder === "asc" 
      ? asc(creator.createdAt)
      : desc(creator.createdAt)

    const creators = await db
      .select()
      .from(creator)
      .where(whereClause)
      .orderBy(orderByClause)
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
        banned: userRecord?.banned || false,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      }
    })

    const response: AdminListResponse<typeof creatorsWithDetails[0]> = {
      rows: creatorsWithDetails,
      total: totalCount,
    }

    return NextResponse.json(response)
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

