import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/client"
import { membership } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { uploadToR2 } from "@/lib/storage/r2"

// POST - Upload membership cover image
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Check if user has creator role
    if (session.user.role !== "creator") {
      return NextResponse.json(
        { error: "Forbidden: Creator role required" },
        { status: 403 }
      )
    }

    const { id } = await params

    // Verify membership exists and belongs to the creator
    const membershipRecord = await db.query.membership.findFirst({
      where: (m, { eq: eqOp, and: andOp }) =>
        andOp(eqOp(m.id, id), eqOp(m.creatorId, session.user.id)),
    })

    if (!membershipRecord) {
      return NextResponse.json(
        { error: "Membership not found" },
        { status: 404 }
      )
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size must be less than 10MB" },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to R2 with path: /creatorId/membership/membershipId/cover.jpg
    const r2Key = `${session.user.id}/membership/${id}/cover.jpg`
    const publicUrl = await uploadToR2({
      file: buffer,
      key: r2Key,
      contentType: file.type,
    })

    // Update membership record
    await db
      .update(membership)
      .set({
        coverImageUrl: publicUrl,
        updatedAt: new Date(),
      })
      .where(eq(membership.id, id))

    return NextResponse.json({
      success: true,
      url: publicUrl,
    })
  } catch (error) {
    console.error("Error uploading membership cover image:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

