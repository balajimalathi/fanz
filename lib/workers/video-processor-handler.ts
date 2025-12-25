import { Job } from "bullmq"
import { exec } from "child_process"
import { promisify } from "util"
import { join } from "path"
import { mkdir, rm, writeFile, rename } from "fs/promises"
import { db } from "@/lib/db/client"
import { post, postMedia } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { uploadFileToR2, uploadDirectoryToR2, getR2FileUrl } from "@/lib/storage/r2"
import { VideoProcessingJobData } from "@/lib/queue/video-processing"

const execAsync = promisify(exec)

// Variant definitions: resolution, video bitrate, label
const variants = [
  { resolution: "854x480", bitrate: "1000k", label: "480p" },
  { resolution: "1280x720", bitrate: "2500k", label: "720p" },
  { resolution: "1920x1080", bitrate: "5000k", label: "1080p" },
  { resolution: "2560x1440", bitrate: "8000k", label: "1440p" },
]

/**
 * Process a video job - handles FFmpeg transcoding and R2 upload
 */
export async function processVideoJob(job: Job<VideoProcessingJobData>) {
  const { mediaId, videoPath, videoId, postId } = job.data

  try {
    // Get creatorId from postId
    const postRecord = await db.query.post.findFirst({
      where: (p, { eq: eqOp }) => eqOp(p.id, postId),
    })

    if (!postRecord) {
      throw new Error(`Post not found: ${postId}`)
    }

    const creatorId = postRecord.creatorId

    // Update job progress
    await job.updateProgress(10)

    // Update status to processing in database
    await db
      .update(postMedia)
      .set({
        metadata: {
          processingStatus: "processing",
        },
      })
      .where(eq(postMedia.id, mediaId))

    await job.updateProgress(20)

    // Create output directory for HLS
    const outputDir = join(process.cwd(), "tmp", "hls", videoId)
    await mkdir(outputDir, { recursive: true })

    // Create subdirectories for each quality variant (using numeric indices for FFmpeg)
    // FFmpeg will use hls_0, hls_1, etc. which we'll rename to label-based names after
    for (let i = 0; i < variants.length; i++) {
      const variantDir = join(outputDir, `hls_${i}`)
      await mkdir(variantDir, { recursive: true })
    }

    await job.updateProgress(30)

    // Normalize paths to use forward slashes for FFmpeg (works on Windows too)
    const normalizedOutputDir = outputDir.replace(/\\/g, "/")
    const normalizedVideoPath = videoPath.replace(/\\/g, "/")

    // Process each variant separately (like the script approach)
    // This avoids var_stream_map issues and is more reliable
    console.log(`[Job ${job.id}] Starting FFmpeg transcoding for video ${videoId}...`)
    
    for (let i = 0; i < variants.length; i++) {
      const variant = variants[i]
      const variantDir = join(outputDir, `hls_${i}`)
      const normalizedVariantDir = variantDir.replace(/\\/g, "/")
      
      // Build FFmpeg command for this variant
      // Each variant gets its own separate FFmpeg run
      const bitrateNum = parseInt(variant.bitrate)
      const segmentFilename = `${normalizedVariantDir}/segment_%03d.ts`
      const playlistPath = `${normalizedVariantDir}/playlist.m3u8`
      
      const ffmpegCommand = `ffmpeg -i "${normalizedVideoPath}" -preset veryfast -g 48 -sc_threshold 0 -map 0:v:0 -map 0:a:0? -s ${variant.resolution} -c:v libx264 -b:v ${variant.bitrate} -maxrate ${variant.bitrate} -bufsize ${bitrateNum * 2}k -c:a aac -b:a 128k -f hls -hls_time 4 -hls_list_size 0 -hls_segment_filename "${segmentFilename}" "${playlistPath}"`
      
      console.log(`[Job ${job.id}] Processing variant ${variant.label} (${variant.resolution}@${variant.bitrate})...`)
      
      try {
        await execAsync(ffmpegCommand)
        console.log(`[Job ${job.id}] Variant ${variant.label} completed`)
      } catch (error: any) {
        console.error(`[Job ${job.id}] FFmpeg command that failed for ${variant.label}:`, ffmpegCommand)
        console.error(`[Job ${job.id}] FFmpeg stderr:`, error.stderr?.substring(0, 1000))
        throw error
      }
      
      // Update progress incrementally (30% to 50% across all variants)
      await job.updateProgress(30 + Math.floor((i + 1) * 20 / variants.length))
    }
    
    console.log(`[Job ${job.id}] FFmpeg transcoding completed for all variants`)
    await job.updateProgress(50)

    // Rename directories from numeric indices (hls_0, hls_1, etc.) to label-based names (480p, 720p, etc.)
    console.log(`[Job ${job.id}] Renaming variant directories to label-based names...`)
    for (let i = 0; i < variants.length; i++) {
      const oldDir = join(outputDir, `hls_${i}`)
      const newDir = join(outputDir, variants[i].label)
      try {
        await rename(oldDir, newDir)
      } catch (error) {
        console.error(`[Job ${job.id}] Error renaming ${oldDir} to ${newDir}:`, error)
        throw error
      }
    }
    console.log(`[Job ${job.id}] Directory renaming completed`)
    await job.updateProgress(55)

    // Manually generate master playlist with proper HLS format
    console.log(`[Job ${job.id}] Generating master playlist...`)
    const masterPlaylistPath = join(outputDir, "playlist.m3u8")
    let masterPlaylistContent = "#EXTM3U\n#EXT-X-VERSION:3\n"
    
    for (const variant of variants) {
      // Convert bitrate from "1000k" to bits per second (1000000)
      const bitrateBps = parseInt(variant.bitrate) * 1000
      masterPlaylistContent += `#EXT-X-STREAM-INF:BANDWIDTH=${bitrateBps},RESOLUTION=${variant.resolution}\n`
      masterPlaylistContent += `${variant.label}/playlist.m3u8\n`
    }
    
    await writeFile(masterPlaylistPath, masterPlaylistContent, "utf-8")
    console.log(`[Job ${job.id}] Master playlist generated`)
    await job.updateProgress(60)

    // Extract thumbnail at 1 second
    const thumbPath = join(outputDir, "thumb.jpg")
    const normalizedThumbPath = thumbPath.replace(/\\/g, "/")
    const thumbCommand = `ffmpeg -i "${normalizedVideoPath}" -ss 00:00:01 -vframes 1 -q:v 2 "${normalizedThumbPath}"`
    await execAsync(thumbCommand)
    console.log(`[Job ${job.id}] Thumbnail extracted`)
    await job.updateProgress(70)

    // Create blurred thumbnail
    const blurPath = join(outputDir, "blur.jpg")
    const normalizedBlurPath = blurPath.replace(/\\/g, "/")
    const blurCommand = `ffmpeg -i "${normalizedThumbPath}" -vf "boxblur=20:2" "${normalizedBlurPath}"`
    await execAsync(blurCommand)
    console.log(`[Job ${job.id}] Blurred thumbnail created`)
    await job.updateProgress(75)

    // Upload HLS files to R2
    const hlsBaseKey = `${creatorId}/posts/${postId}/videos/${videoId}/`
    console.log(`[Job ${job.id}] Uploading HLS files to R2...`)
    const hlsUrls = await uploadDirectoryToR2({
      dirPath: outputDir,
      baseKey: hlsBaseKey,
      fileExtensions: [".m3u8", ".ts"],
    })
    console.log(`[Job ${job.id}] Uploaded ${hlsUrls.length} HLS files`)
    await job.updateProgress(90)

    // Upload thumbnails
    const thumbKey = `${creatorId}/posts/${postId}/videos/${videoId}/thumb.jpg`
    const thumbUrl = await uploadFileToR2({
      filePath: thumbPath,
      key: thumbKey,
      contentType: "image/jpeg",
    })

    const blurKey = `${creatorId}/posts/${postId}/videos/${videoId}/blur.jpg`
    const blurUrl = await uploadFileToR2({
      filePath: blurPath,
      key: blurKey,
      contentType: "image/jpeg",
    })

    // Get master playlist URL (using playlist.m3u8 to match script approach)
    const masterPlaylistUrl = getR2FileUrl(`${hlsBaseKey}playlist.m3u8`)

    // Update media record with processed URLs
    await db
      .update(postMedia)
      .set({
        hlsUrl: masterPlaylistUrl,
        thumbnailUrl: thumbUrl,
        blurThumbnailUrl: blurUrl,
        metadata: {
          processingStatus: "ready",
          hlsFilesCount: hlsUrls.length,
          processedAt: new Date().toISOString(),
        },
      })
      .where(eq(postMedia.id, mediaId))

    await job.updateProgress(100)

    // Clean up temp files
    try {
      await rm(outputDir, { recursive: true, force: true })
      await rm(videoPath, { force: true })
      console.log(`[Job ${job.id}] Cleaned up temp files`)
    } catch (cleanupError) {
      console.error(`[Job ${job.id}] Error cleaning up temp files:`, cleanupError)
      // Don't fail the job if cleanup fails
    }

    console.log(`[Job ${job.id}] Video processing completed successfully`)

    return {
      success: true,
      hlsUrl: masterPlaylistUrl,
      thumbnailUrl: thumbUrl,
      blurThumbnailUrl: blurUrl,
      hlsFilesCount: hlsUrls.length,
    }
  } catch (error: any) {
    console.error(`[Job ${job.id}] Video processing error:`, error)

    // Update status to failed in database
    try {
      await db
        .update(postMedia)
        .set({
          metadata: {
            processingStatus: "failed",
            error: error.message || "FFmpeg processing failed",
            failedAt: new Date().toISOString(),
          },
        })
        .where(eq(postMedia.id, mediaId))
    } catch (dbError) {
      console.error(`[Job ${job.id}] Failed to update database:`, dbError)
    }

    // Clean up on error
    try {
      const outputDir = join(process.cwd(), "tmp", "hls", videoId)
      await rm(outputDir, { recursive: true, force: true })
    } catch (cleanupError) {
      console.error(`[Job ${job.id}] Error cleaning up on failure:`, cleanupError)
    }

    // Re-throw to mark job as failed
    throw error
  }
}

