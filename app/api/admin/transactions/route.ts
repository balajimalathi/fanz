import { NextRequest, NextResponse } from "next/server"
import { checkAdminAccess } from "@/lib/utils/admin-auth"
import { db } from "@/lib/db/client"
import { paymentTransaction, creator, user } from "@/lib/db/schema"
import { eq, desc, asc, and, inArray, count, or, like } from "drizzle-orm"
import { AdminListResponse } from "@/types/admin-table"

export async function GET(request: NextRequest) {
  try {
    const authError = await checkAdminAccess()
    if (authError) return authError

    const { searchParams } = new URL(request.url)
    const creatorId = searchParams.get("creatorId")
    const status = searchParams.get("status") // Comma-separated
    const type = searchParams.get("type") // Comma-separated
    const search = searchParams.get("search") // Search by user name or email
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "10")
    const sortBy = searchParams.get("sortBy") || "createdAt"
    const sortOrder = searchParams.get("sortOrder") || "desc"
    
    const limit = pageSize
    const offset = (page - 1) * pageSize

    // If searching by user name/email, first get matching user IDs
    let userIdsToFilter: string[] | null = null
    if (search) {
      const matchingUsers = await db
        .select({ id: user.id })
        .from(user)
        .where(
          or(
            like(user.name, `%${search}%`),
            like(user.email, `%${search}%`)
          )!
        )
      
      userIdsToFilter = matchingUsers.map((u) => u.id)
      // If no users match the search, return empty results
      if (userIdsToFilter.length === 0) {
        return NextResponse.json({
          rows: [],
          total: 0,
        } as AdminListResponse<any>)
      }
    }

    let whereConditions = []

    if (creatorId) {
      whereConditions.push(eq(paymentTransaction.creatorId, creatorId))
    }

    // Filter by user IDs if search is provided
    if (userIdsToFilter && userIdsToFilter.length > 0) {
      if (userIdsToFilter.length === 1) {
        whereConditions.push(eq(paymentTransaction.userId, userIdsToFilter[0]))
      } else {
        whereConditions.push(inArray(paymentTransaction.userId, userIdsToFilter))
      }
    }

    // Filter by status (comma-separated)
    if (status) {
      const statuses = status.split(",").filter(Boolean)
      if (statuses.length === 1) {
        whereConditions.push(eq(paymentTransaction.status, statuses[0] as any))
      } else if (statuses.length > 1) {
        whereConditions.push(inArray(paymentTransaction.status, statuses as any[]))
      }
    }

    // Filter by type (comma-separated)
    if (type) {
      const types = type.split(",").filter(Boolean)
      if (types.length === 1) {
        whereConditions.push(eq(paymentTransaction.type, types[0] as any))
      } else if (types.length > 1) {
        whereConditions.push(inArray(paymentTransaction.type, types as any[]))
      }
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined

    // Get total count
    const [{ totalCount }] = await db
      .select({ totalCount: count() })
      .from(paymentTransaction)
      .where(whereClause)

    // Determine sort order
    const orderByClause = sortOrder === "asc" 
      ? asc(paymentTransaction.createdAt)
      : desc(paymentTransaction.createdAt)

    // Fetch transactions with pagination
    const transactions = await db
      .select()
      .from(paymentTransaction)
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset)

    // Get creator and user details
    const creatorIds = [...new Set(transactions.map((t) => t.creatorId))]
    const userIds = [...new Set(transactions.map((t) => t.userId))]

    const creators = creatorIds.length > 0
      ? await db.query.creator.findMany({
          where: (c, { inArray: inArrayOp }) => inArrayOp(c.id, creatorIds),
        })
      : []

    const users = userIds.length > 0
      ? await db.query.user.findMany({
          where: (u, { inArray: inArrayOp }) => inArrayOp(u.id, userIds),
        })
      : []

    const creatorMap = new Map(creators.map((c) => [c.id, c]))
    const userMap = new Map(users.map((u) => [u.id, u]))

    const transactionsWithDetails = transactions.map((t) => {
      const userRecord = userMap.get(t.userId)
      return {
        id: t.id,
        userId: t.userId,
        userName: userRecord?.name || "Unknown",
        userEmail: userRecord?.email || "",
        creatorId: t.creatorId,
        creatorName: creatorMap.get(t.creatorId)?.displayName || "Unknown",
        type: t.type,
        entityId: t.entityId,
        amount: t.amount / 100,
        platformFee: t.platformFee / 100,
        creatorAmount: t.creatorAmount / 100,
        status: t.status,
        gatewayTransactionId: t.gatewayTransactionId,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      }
    })

    const response: AdminListResponse<typeof transactionsWithDetails[0]> = {
      rows: transactionsWithDetails,
      total: totalCount,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error fetching transactions:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

