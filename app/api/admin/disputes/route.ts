import { NextRequest, NextResponse } from "next/server"
import { checkAdminAccess } from "@/lib/utils/admin-auth"
import { db } from "@/lib/db/client"
import { dispute, user, creator } from "@/lib/db/schema"
import { eq, desc, asc, and, inArray, count } from "drizzle-orm"
import { AdminListResponse } from "@/types/admin-table"

export async function GET(request: NextRequest) {
  try {
    const authError = await checkAdminAccess()
    if (authError) return authError

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") // Comma-separated
    const disputeType = searchParams.get("type") // Comma-separated
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "10")
    const sortBy = searchParams.get("sortBy") || "createdAt"
    const sortOrder = searchParams.get("sortOrder") || "desc"
    
    const limit = pageSize
    const offset = (page - 1) * pageSize

    let whereConditions = []

    if (status) {
      const statuses = status.split(",").filter(Boolean)
      if (statuses.length === 1) {
        whereConditions.push(eq(dispute.status, statuses[0] as any))
      } else if (statuses.length > 1) {
        whereConditions.push(inArray(dispute.status, statuses as any[]))
      }
    }

    if (disputeType) {
      const types = disputeType.split(",").filter(Boolean)
      if (types.length === 1) {
        whereConditions.push(eq(dispute.disputeType, types[0] as any))
      } else if (types.length > 1) {
        whereConditions.push(inArray(dispute.disputeType, types as any[]))
      }
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined

    // Get total count
    const [{ totalCount }] = await db
      .select({ totalCount: count() })
      .from(dispute)
      .where(whereClause)

    // Determine sort order
    const orderByClause = sortOrder === "asc" 
      ? asc(dispute.createdAt)
      : desc(dispute.createdAt)

    const disputes = await db
      .select()
      .from(dispute)
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset)

    // Get user and creator details
    const userIds = [...new Set(disputes.map((d) => d.userId))]
    const users = userIds.length > 0
      ? await db.query.user.findMany({
          where: (u, { inArray: inArrayOp }) => inArrayOp(u.id, userIds),
        })
      : []

    const userMap = new Map(users.map((u) => [u.id, u]))

    const creatorIds = disputes
      .map((d) => d.creatorId)
      .filter((id): id is string => id !== null)
    const creators = creatorIds.length > 0
      ? await db.query.creator.findMany({
          where: (c, { inArray: inArrayOp }) => inArrayOp(c.id, creatorIds),
        })
      : []

    const creatorMap = new Map(creators.map((c) => [c.id, c]))

    const disputesWithDetails = disputes.map((d) => {
      const userRecord = userMap.get(d.userId)
      const creatorRecord = d.creatorId ? creatorMap.get(d.creatorId) : null

      return {
        id: d.id,
        userId: d.userId,
        userName: userRecord?.name || "Unknown",
        userEmail: userRecord?.email || "",
        creatorId: d.creatorId,
        creatorName: creatorRecord?.displayName || null,
        transactionId: d.transactionId,
        payoutId: d.payoutId,
        disputeType: d.disputeType,
        reason: d.reason,
        description: d.description,
        status: d.status,
        resolution: d.resolution,
        resolvedAt: d.resolvedAt?.toISOString() || null,
        resolvedBy: d.resolvedBy,
        createdAt: d.createdAt.toISOString(),
      }
    })

    const response: AdminListResponse<typeof disputesWithDetails[0]> = {
      rows: disputesWithDetails,
      total: totalCount,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error fetching disputes:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

