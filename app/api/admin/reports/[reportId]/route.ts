import { NextRequest, NextResponse } from "next/server"
import { checkAdminAccess, requireAdmin } from "@/lib/utils/admin-auth"
import { db } from "@/lib/db/client"
import { report } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const authError = await checkAdminAccess()
    if (authError) return authError

    const { reportId } = await params

    const reportRecord = await db.query.report.findFirst({
      where: (r, { eq: eqOp }) => eqOp(r.id, reportId),
    })

    if (!reportRecord) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 })
    }

    return NextResponse.json({ report: reportRecord })
  } catch (error) {
    console.error("Error fetching report:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const adminUser = await requireAdmin()
    if (!adminUser) {
      return NextResponse.json(
        { error: "Forbidden: Admin role required" },
        { status: 403 }
      )
    }

    const { reportId } = await params
    const body = await request.json()
    const { status, resolution } = body

    if (!status || !["pending", "reviewing", "resolved", "dismissed"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      )
    }

    const updateData: any = {
      status,
      updatedAt: new Date(),
    }

    if (status === "resolved" || status === "dismissed") {
      updateData.resolvedAt = new Date()
      updateData.resolvedBy = adminUser.id
      if (resolution) {
        updateData.resolution = resolution
      }
    }

    await db.update(report).set(updateData).where(eq(report.id, reportId))

    return NextResponse.json({
      success: true,
      message: "Report updated successfully",
    })
  } catch (error) {
    console.error("Error updating report:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

