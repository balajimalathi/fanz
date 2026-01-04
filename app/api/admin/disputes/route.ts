import { NextRequest, NextResponse } from "next/server"
import { checkAdminAccess } from "@/lib/utils/admin-auth"
import { db } from "@/lib/db/client"
import { dispute, user, creator } from "@/lib/db/schema"
import { eq, desc, and, inArray } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const authError = await checkAdminAccess()
    if (authError) return authError

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const disputeType = searchParams.get("type")
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

    let whereConditions = []

    if (status) {
      whereConditions.push(eq(dispute.status, status as any))
    }

    if (disputeType) {
      whereConditions.push(eq(dispute.disputeType, disputeType as any))
    }

    const disputes = await db
      .select()
      .from(dispute)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(dispute.createdAt))
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

    return NextResponse.json({ disputes: disputesWithDetails })
  } catch (error) {
    console.error("Error fetching disputes:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

