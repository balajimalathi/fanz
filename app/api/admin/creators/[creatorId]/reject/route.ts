import { NextRequest, NextResponse } from "next/server"
import { checkAdminAccess } from "@/lib/utils/admin-auth"
import { db } from "@/lib/db/client"
import { creator } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ creatorId: string }> }
) {
  try {
    const authError = await checkAdminAccess()
    if (authError) return authError

    const { creatorId } = await params
    const body = await request.json()
    const { reason } = body // Optional rejection reason

    const creatorRecord = await db.query.creator.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, creatorId),
    })

    if (!creatorRecord) {
      return NextResponse.json({ error: "Creator not found" }, { status: 404 })
    }

    await db
      .update(creator)
      .set({
        onboarded: false,
        updatedAt: new Date(),
      })
      .where(eq(creator.id, creatorId))

    return NextResponse.json({
      success: true,
      message: "Creator rejected",
      reason: reason || null,
    })
  } catch (error) {
    console.error("Error rejecting creator:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

