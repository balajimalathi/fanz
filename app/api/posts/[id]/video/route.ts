import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/client"
import { post, postMedia } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { uploadToR2 } from "@/lib/storage/r2"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { randomUUID } from "crypto"
import { enqueueVideoProcessing } from "@/lib/queue/video-processing"

// POST - Upload video file for a post
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
        { error: "Forbidden: You can only upload videos to your own posts" },
        { status: 403 }
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
    if (!file.type.startsWith("video/")) {
      return NextResponse.json(
        { error: "File must be a video" },
        { status: 400 }
      )
    }

    // Validate file size (max 500MB)
    const maxSize = 500 * 1024 * 1024 // 500MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size must be less than 500MB" },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Create temp directory for video processing
    const tempDir = join(process.cwd(), "tmp", "videos", postId)
    await mkdir(tempDir, { recursive: true })

    // Save video to temp location
    const videoId = randomUUID()
    const videoFilename = `${videoId}.mp4`
    const videoPath = join(tempDir, videoFilename)
    await writeFile(videoPath, buffer)

    // Upload original video to R2 as backup/staging
    const videoKey = `${session.user.id}/posts/${postId}/videos/${videoFilename}`
    const videoUrl = await uploadToR2({
      file: buffer,
      key: videoKey,
      contentType: file.type,
    })

    // Get existing media count for orderIndex
    const existingMedia = await db.query.postMedia.findMany({
      where: (pm, { eq: eqOp }) => eqOp(pm.postId, postId),
    })
    const orderIndex = existingMedia.length

    // Create media record with processing status
    const [mediaRecord] = await db
      .insert(postMedia)
      .values({
        postId,
        mediaType: "video",
        url: videoUrl, // Original video URL
        metadata: {
          originalName: file.name,
          size: file.size,
          type: file.type,
          processingStatus: "pending",
          videoId,
          videoPath,
        },
        orderIndex,
      })
      .returning()

    // Enqueue video processing job
    try {
      await enqueueVideoProcessing({
        mediaId: mediaRecord.id,
        videoPath,
        videoId,
        postId,
      })
      console.log(`Video processing job enqueued for media ${mediaRecord.id}`)
    } catch (error) {
      console.error("Failed to enqueue video processing job:", error)
      // Don't fail the upload if queue fails - job can be retried later
    }

    return NextResponse.json({
      success: true,
      media: mediaRecord,
      message: "Video uploaded. Processing will begin shortly.",
    })
  } catch (error) {
    console.error("Error uploading video:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

