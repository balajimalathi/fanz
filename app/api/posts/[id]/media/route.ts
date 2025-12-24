import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/client"
import { post, postMedia } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { uploadToR2 } from "@/lib/storage/r2"
import { generateThumbnail } from "@/lib/utils/image-processing-server"

// POST - Upload media files for a post
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

    const { id: postId } = await params

    // Verify post exists and belongs to creator
    const postRecord = await db.query.post.findFirst({
      where: (p, { eq: eqOp }) => eqOp(p.id, postId),
    })

    if (!postRecord) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      )
    }

    if (postRecord.creatorId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden: You can only upload media to your own posts" },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const files = formData.getAll("files") as File[]

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      )
    }

    // Validate all files
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        return NextResponse.json(
          { error: `File ${file.name} must be an image` },
          { status: 400 }
        )
      }

      const maxSize = 10 * 1024 * 1024 // 10MB
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: `File ${file.name} must be less than 10MB` },
          { status: 400 }
        )
      }
    }

    // Get existing media count for orderIndex
    const existingMedia = await db.query.postMedia.findMany({
      where: (pm, { eq: eqOp }) => eqOp(pm.postId, postId),
    })
    let orderIndex = existingMedia.length

    const uploadedMedia = []

    // Process each file
    for (const file of files) {
      // Convert file to buffer
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Generate thumbnail
      let thumbnailBuffer: Buffer | null = null
      let thumbnailUrl: string | null = null
      try {
        thumbnailBuffer = await generateThumbnail(buffer)
      } catch (error) {
        console.error("Error generating thumbnail:", error)
        // Continue without thumbnail
      }

      // Generate unique filename
      const timestamp = Date.now()
      const randomStr = Math.random().toString(36).substring(2, 15)
      const extension = file.name.split(".").pop() || "jpg"
      const filename = `${timestamp}-${randomStr}.${extension}`
      const thumbnailFilename = `${timestamp}-${randomStr}-thumb.jpg`

      // Upload full image to R2
      const imageKey = `${session.user.id}/posts/${postId}/${filename}`
      const imageUrl = await uploadToR2({
        file: buffer,
        key: imageKey,
        contentType: file.type,
      })

      // Upload thumbnail to R2 if generated
      if (thumbnailBuffer) {
        const thumbnailKey = `${session.user.id}/posts/${postId}/thumbnails/${thumbnailFilename}`
        thumbnailUrl = await uploadToR2({
          file: thumbnailBuffer,
          key: thumbnailKey,
          contentType: "image/jpeg",
        })
      }

      // Create media record
      const [mediaRecord] = await db
        .insert(postMedia)
        .values({
          postId,
          mediaType: "image",
          url: imageUrl,
          thumbnailUrl,
          metadata: {
            originalName: file.name,
            size: file.size,
            type: file.type,
          },
          orderIndex,
        })
        .returning()

      uploadedMedia.push(mediaRecord)
      orderIndex++
    }

    return NextResponse.json({
      success: true,
      media: uploadedMedia,
    })
  } catch (error) {
    console.error("Error uploading media:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

