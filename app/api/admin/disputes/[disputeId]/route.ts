import { NextRequest, NextResponse } from "next/server"
import { checkAdminAccess, requireAdmin } from "@/lib/utils/admin-auth"
import { db } from "@/lib/db/client"
import { dispute } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ disputeId: string }> }
) {
  try {
    const authError = await checkAdminAccess()
    if (authError) return authError

    const { disputeId } = await params

    const disputeRecord = await db.query.dispute.findFirst({
      where: (d, { eq: eqOp }) => eqOp(d.id, disputeId),
    })

    if (!disputeRecord) {
      return NextResponse.json({ error: "Dispute not found" }, { status: 404 })
    }

    return NextResponse.json({ dispute: disputeRecord })
  } catch (error) {
    console.error("Error fetching dispute:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ disputeId: string }> }
) {
  try {
    const adminUser = await requireAdmin()
    if (!adminUser) {
      return NextResponse.json(
        { error: "Forbidden: Admin role required" },
        { status: 403 }
      )
    }

    const { disputeId } = await params
    const body = await request.json()
    const { status, resolution } = body

    if (!status || !["open", "investigating", "resolved", "closed"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      )
    }

    const updateData: any = {
      status,
      updatedAt: new Date(),
    }

    if (status === "resolved" || status === "closed") {
      updateData.resolvedAt = new Date()
      updateData.resolvedBy = adminUser.id
      if (resolution) {
        updateData.resolution = resolution
      }
    }

    await db.update(dispute).set(updateData).where(eq(dispute.id, disputeId))

    return NextResponse.json({
      success: true,
      message: "Dispute updated successfully",
    })
  } catch (error) {
    console.error("Error updating dispute:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

