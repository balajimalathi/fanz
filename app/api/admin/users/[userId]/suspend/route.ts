import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { checkAdminAccess } from "@/lib/utils/admin-auth"
import { db } from "@/lib/db/client"
import { user } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const authError = await checkAdminAccess()
    if (authError) return authError

    const { userId } = await params
    const body = await request.json()
    const { reason, banExpires } = body

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      )
    }

    // Get admin user for resolvedBy
    const session = await import("@/lib/auth/auth").then((m) => m.auth.api.getSession({
      headers: await headers(),
    }))
    const adminId = session?.user?.id

    if (!adminId) {
      return NextResponse.json(
        { error: "Admin session not found" },
        { status: 401 }
      )
    }

    // Check if user exists
    const userRecord = await db.query.user.findFirst({
      where: (u, { eq: eqOp }) => eqOp(u.id, userId),
    })

    if (!userRecord) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Prevent suspending admins
    if (userRecord.role === "admin") {
      return NextResponse.json(
        { error: "Cannot suspend admin users" },
        { status: 403 }
      )
    }

    // Update user to suspended
    await db
      .update(user)
      .set({
        banned: true,
        banReason: reason || "Suspended by admin",
        banExpires: banExpires ? new Date(banExpires) : null,
        updatedAt: new Date(),
      })
      .where(eq(user.id, userId))

    return NextResponse.json({
      success: true,
      message: "User suspended successfully",
    })
  } catch (error) {
    console.error("Error suspending user:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
