import { NextRequest, NextResponse } from "next/server"
import { checkAdminAccess } from "@/lib/utils/admin-auth"
import { db } from "@/lib/db/client"
import { report, user, creator, post } from "@/lib/db/schema"
import { eq, desc, and, or, like, inArray } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const authError = await checkAdminAccess()
    if (authError) return authError

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const reportType = searchParams.get("type")
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

    let whereConditions = []

    if (status) {
      whereConditions.push(eq(report.status, status as any))
    }

    if (reportType) {
      whereConditions.push(eq(report.reportType, reportType as any))
    }

    const reports = await db
      .select()
      .from(report)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(report.createdAt))
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

    return NextResponse.json({ reports: reportsWithDetails })
  } catch (error) {
    console.error("Error fetching reports:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

