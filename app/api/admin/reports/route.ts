import { NextRequest, NextResponse } from "next/server"
import { checkAdminAccess } from "@/lib/utils/admin-auth"
import { db } from "@/lib/db/client"
import { report, user, creator, post } from "@/lib/db/schema"
import { eq, desc, asc, and, or, like, inArray, count } from "drizzle-orm"
import { AdminListResponse } from "@/types/admin-table"

export async function GET(request: NextRequest) {
  try {
    const authError = await checkAdminAccess()
    if (authError) return authError

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") // Comma-separated
    const reportType = searchParams.get("type") // Comma-separated
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
        whereConditions.push(eq(report.status, statuses[0] as any))
      } else if (statuses.length > 1) {
        whereConditions.push(inArray(report.status, statuses as any[]))
      }
    }

    if (reportType) {
      const types = reportType.split(",").filter(Boolean)
      if (types.length === 1) {
        whereConditions.push(eq(report.reportType, types[0] as any))
      } else if (types.length > 1) {
        whereConditions.push(inArray(report.reportType, types as any[]))
      }
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined

    // Get total count
    const [{ totalCount }] = await db
      .select({ totalCount: count() })
      .from(report)
      .where(whereClause)

    // Determine sort order
    const orderByClause = sortOrder === "asc" 
      ? asc(report.createdAt)
      : desc(report.createdAt)

    const reports = await db
      .select()
      .from(report)
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset)

    // Get reporter details
    const reporterIds = [...new Set(reports.map((r) => r.reporterId))]
    const reporters = reporterIds.length > 0
      ? await db.query.user.findMany({
          where: (u, { inArray: inArrayOp }) => inArrayOp(u.id, reporterIds),
        })
      : []

    const reporterMap = new Map(reporters.map((u) => [u.id, u]))

    // Get reported user/creator details
    const reportedUserIds = reports
      .map((r) => r.reportedUserId)
      .filter((id): id is string => id !== null)
    const reportedUsers = reportedUserIds.length > 0
      ? await db.query.user.findMany({
          where: (u, { inArray: inArrayOp }) => inArrayOp(u.id, reportedUserIds),
        })
      : []

    const reportedUserMap = new Map(reportedUsers.map((u) => [u.id, u]))

    const reportedCreatorIds = reports
      .map((r) => r.reportedCreatorId)
      .filter((id): id is string => id !== null)
    const reportedCreators = reportedCreatorIds.length > 0
      ? await db.query.creator.findMany({
          where: (c, { inArray: inArrayOp }) => inArrayOp(c.id, reportedCreatorIds),
        })
      : []

    const reportedCreatorMap = new Map(reportedCreators.map((c) => [c.id, c]))

    const reportsWithDetails = reports.map((r) => {
      const reporter = reporterMap.get(r.reporterId)
      const reportedUser = r.reportedUserId
        ? reportedUserMap.get(r.reportedUserId)
        : null
      const reportedCreator = r.reportedCreatorId
        ? reportedCreatorMap.get(r.reportedCreatorId)
        : null

      return {
        id: r.id,
        reporterId: r.reporterId,
        reporterName: reporter?.name || "Unknown",
        reporterEmail: reporter?.email || "",
        reportedUserId: r.reportedUserId,
        reportedUserName: reportedUser?.name || null,
        reportedCreatorId: r.reportedCreatorId,
        reportedCreatorName: reportedCreator?.displayName || null,
        reportedPostId: r.reportedPostId,
        reportType: r.reportType,
        reason: r.reason,
        description: r.description,
        status: r.status,
        resolvedAt: r.resolvedAt?.toISOString() || null,
        resolvedBy: r.resolvedBy,
        resolution: r.resolution,
        createdAt: r.createdAt.toISOString(),
      }
    })

    const response: AdminListResponse<typeof reportsWithDetails[0]> = {
      rows: reportsWithDetails,
      total: totalCount,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error fetching reports:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

