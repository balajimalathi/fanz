import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/client"
import { creator } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { uploadToR2 } from "@/lib/storage/r2"

// GET - Fetch creator profile and cover image URLs
export async function GET(request: NextRequest) {
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

    // Fetch creator record
    const creatorRecord = await db.query.creator.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, session.user.id),
    })

    if (!creatorRecord) {
      return NextResponse.json(
        { error: "Creator not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      profileImageUrl: creatorRecord.profileImageUrl || null,
      profileCoverUrl: creatorRecord.profileCoverUrl || null,
    })
  } catch (error) {
    console.error("Error fetching creator images:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - Upload profile image or cover image
export async function POST(request: NextRequest) {
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

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const imageType = formData.get("type") as string | null

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }

    if (!imageType || (imageType !== "profile" && imageType !== "cover")) {
      return NextResponse.json(
        { error: "Invalid image type. Must be 'profile' or 'cover'" },
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

    // Determine file extension
    const extension = file.name.split(".").pop() || "jpg"
    const filename = imageType === "profile" ? "profile.jpg" : "cover.jpg"

    // Upload to R2 with path: /creatorId/profile/profile.jpg or /creatorId/profile/cover.jpg
    const r2Key = `${session.user.id}/profile/${filename}`
    const publicUrl = await uploadToR2({
      file: buffer,
      key: r2Key,
      contentType: file.type,
    })

    // Update creator record
    const updateData: { profileImageUrl?: string; profileCoverUrl?: string; updatedAt: Date } = {
      updatedAt: new Date(),
    }

    if (imageType === "profile") {
      updateData.profileImageUrl = publicUrl
    } else {
      updateData.profileCoverUrl = publicUrl
    }

    await db
      .update(creator)
      .set(updateData)
      .where(eq(creator.id, session.user.id))

    return NextResponse.json({
      success: true,
      url: publicUrl,
      type: imageType,
    })
  } catch (error) {
    console.error("Error uploading image:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

