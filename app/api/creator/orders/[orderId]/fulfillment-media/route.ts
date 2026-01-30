import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/client"
import { serviceOrder, service, creator } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { uploadToR2 } from "@/lib/storage/r2"
import { addImageWatermark, getSubdomainUrl, getVideoWatermarkFilter } from "@/lib/utils/watermark"
import { exec } from "child_process"
import { promisify } from "util"
import { writeFile, mkdir, unlink, readFile } from "fs/promises"
import { join } from "path"
import { randomUUID } from "crypto"

const execAsync = promisify(exec)

// POST - Upload fulfillment media file for an order
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { orderId } = await params

    // Get order and verify it belongs to this creator
    const order = await db.query.serviceOrder.findFirst({
      where: (so, { eq: eqOp }) => eqOp(so.id, orderId),
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    if (order.creatorId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get service to check service type
    const serviceRecord = await db.query.service.findFirst({
      where: (s, { eq: eqOp }) => eqOp(s.id, order.serviceId),
    })

    if (!serviceRecord) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 })
    }

    const serviceType = serviceRecord.serviceType

    // Only allow uploads for custom_video and custom_photo
    if (serviceType !== "custom_video" && serviceType !== "custom_photo") {
      return NextResponse.json(
        { error: "File upload is only allowed for custom video and custom photo services" },
        { status: 400 }
      )
    }

    // Only allow uploads for active orders
    if (order.status !== "active") {
      return NextResponse.json(
        { error: "File can only be uploaded for active orders" },
        { status: 400 }
      )
    }

    // Check if deadline has passed (creator cannot upload after deadline)
    if (order.activatedAt) {
      const defaultDeadlineHours = parseInt(process.env.FULFILLMENT_DEADLINE_HOURS || "12", 10)
      const deadlineHours = order.fulfillmentDeadlineHours || defaultDeadlineHours
      const deadlineDate = new Date(order.activatedAt.getTime() + deadlineHours * 60 * 60 * 1000)
      
      if (new Date() > deadlineDate) {
        return NextResponse.json(
          { 
            error: "Cannot upload fulfillment media after deadline has passed. The order is eligible for refund.",
            deadlineDate: deadlineDate.toISOString(),
          },
          { status: 400 }
        )
      }
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }

    // Validate file type based on service type
    if (serviceType === "custom_video") {
      if (!file.type.startsWith("video/")) {
        return NextResponse.json(
          { error: "File must be a video" },
          { status: 400 }
        )
      }
      // Validate file size (max 500MB for videos)
      const maxSize = 500 * 1024 * 1024 // 500MB
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: "Video file size must be less than 500MB" },
          { status: 400 }
        )
      }
    } else if (serviceType === "custom_photo") {
      if (!file.type.startsWith("image/")) {
        return NextResponse.json(
          { error: "File must be an image" },
          { status: 400 }
        )
      }
      // Validate file size (max 10MB for images)
      const maxSize = 10 * 1024 * 1024 // 10MB
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: "Image file size must be less than 10MB" },
          { status: 400 }
        )
      }
    }

    // Get creator subdomain for watermarking
    const creatorRecord = await db.query.creator.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, order.creatorId),
    })
    const subdomainUrl = getSubdomainUrl(creatorRecord?.subdomain || null)

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    let buffer: Buffer = Buffer.from(arrayBuffer)

    // Apply watermark based on file type
    if (serviceType === "custom_photo") {
      // Apply watermark to image
      try {
        if (subdomainUrl) {
          buffer = await addImageWatermark(buffer, subdomainUrl)
        }
      } catch (error) {
        console.error("Error applying watermark to image:", error)
        // Continue with original image if watermarking fails
      }
    } else if (serviceType === "custom_video") {
      // Process video with watermark using FFmpeg
      try {
        if (subdomainUrl) {
          // Create temp directory for video processing
          const tempDir = join(process.cwd(), "tmp", "fulfillment-videos", orderId)
          await mkdir(tempDir, { recursive: true })

          const videoId = randomUUID()
          const inputPath = join(tempDir, `input-${videoId}.${file.name.split(".").pop() || "mp4"}`)
          const outputPath = join(tempDir, `output-${videoId}.mp4`)

          // Write input video to temp file
          await writeFile(inputPath, buffer)

          // Normalize paths for Windows compatibility
          const normalizedInputPath = inputPath.replace(/\\/g, "/")
          const normalizedOutputPath = outputPath.replace(/\\/g, "/")

          // Get video dimensions for watermark
          const probeCommand = `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of json "${normalizedInputPath}"`
          const { stdout: probeOutput } = await execAsync(probeCommand)
          const probeData = JSON.parse(probeOutput)
          const width = probeData.streams?.[0]?.width || 1920
          const height = probeData.streams?.[0]?.height || 1080

          // Get watermark filter
          const watermarkFilter = getVideoWatermarkFilter(subdomainUrl, width, height)

          // Build FFmpeg command
          let ffmpegCommand = `ffmpeg -i "${normalizedInputPath}" -c:v libx264 -preset medium -crf 23 -c:a copy`
          if (watermarkFilter) {
            ffmpegCommand += ` -vf "${watermarkFilter}"`
          }
          ffmpegCommand += ` "${normalizedOutputPath}"`

          // Process video
          await execAsync(ffmpegCommand)

          // Read watermarked video
          buffer = await readFile(outputPath)

          // Cleanup temp files
          try {
            await unlink(inputPath)
            await unlink(outputPath)
          } catch (cleanupError) {
            console.error("Error cleaning up temp files:", cleanupError)
          }
        }
      } catch (error) {
        console.error("Error applying watermark to video:", error)
        // Continue with original video if watermarking fails
      }
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 15)
    const extension = file.name.split(".").pop() || (serviceType === "custom_video" ? "mp4" : "jpg")
    const filename = `${timestamp}-${randomStr}.${extension}`

    // Upload to R2
    const mediaKey = `${session.user.id}/orders/${orderId}/fulfillment/${filename}`
    const mediaUrl = await uploadToR2({
      file: buffer,
      key: mediaKey,
      contentType: file.type,
    })

    // Update order with fulfillment media URL
    await db
      .update(serviceOrder)
      .set({
        fulfillmentMediaUrl: mediaUrl,
        updatedAt: new Date(),
      })
      .where(eq(serviceOrder.id, orderId))

    return NextResponse.json({
      success: true,
      mediaUrl,
    })
  } catch (error) {
    console.error("Error uploading fulfillment media:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
