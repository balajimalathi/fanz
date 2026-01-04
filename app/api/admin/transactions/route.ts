import { NextRequest, NextResponse } from "next/server"
import { checkAdminAccess } from "@/lib/utils/admin-auth"
import { db } from "@/lib/db/client"
import { paymentTransaction, creator, user } from "@/lib/db/schema"
import { eq, desc, and, inArray } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const authError = await checkAdminAccess()
    if (authError) return authError

    const { searchParams } = new URL(request.url)
    const creatorId = searchParams.get("creatorId")
    const status = searchParams.get("status")
    const type = searchParams.get("type")

    let whereConditions = []

    if (creatorId) {
      whereConditions.push(eq(paymentTransaction.creatorId, creatorId))
    }

    if (status) {
      whereConditions.push(eq(paymentTransaction.status, status as any))
    }

    if (type) {
      whereConditions.push(eq(paymentTransaction.type, type as any))
    }

    const transactions = await db
      .select()
      .from(paymentTransaction)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(paymentTransaction.createdAt))
      .limit(100)

    // Get creator and user details
    const creatorIds = [...new Set(transactions.map((t) => t.creatorId))]
    const userIds = [...new Set(transactions.map((t) => t.userId))]

    const creators = await db.query.creator.findMany({
      where: (c, { inArray: inArrayOp }) => inArrayOp(c.id, creatorIds),
    })

    const users = await db.query.user.findMany({
      where: (u, { inArray: inArrayOp }) => inArrayOp(u.id, userIds),
    })

    const creatorMap = new Map(creators.map((c) => [c.id, c]))
    const userMap = new Map(users.map((u) => [u.id, u]))

    const transactionsWithDetails = transactions.map((t) => ({
      id: t.id,
      userId: t.userId,
      userName: userMap.get(t.userId)?.name || "Unknown",
      userEmail: userMap.get(t.userId)?.email || "",
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
    }))

    return NextResponse.json({ transactions: transactionsWithDetails })
  } catch (error) {
    console.error("Error fetching transactions:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

