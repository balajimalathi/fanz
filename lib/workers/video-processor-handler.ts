import { Job } from "bullmq"
import { exec } from "child_process"
import { promisify } from "util"
import { join } from "path"
import { mkdir, rm } from "fs/promises"
import { db } from "@/lib/db/client"
import { postMedia } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { uploadFileToR2, uploadDirectoryToR2, getR2FileUrl } from "@/lib/storage/r2"
import { VideoProcessingJobData } from "@/lib/queue/video-processing"

const execAsync = promisify(exec)

/**
 * Process a video job - handles FFmpeg transcoding and R2 upload
 */
export async function processVideoJob(job: Job<VideoProcessingJobData>) {
  const { mediaId, videoPath, videoId } = job.data

  try {
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

    // Create subdirectories for each quality
    const hls480Dir = join(outputDir, "hls_0")  // 480p
    const hls720Dir = join(outputDir, "hls_1")  // 720p
    const hls1080Dir = join(outputDir, "hls_2") // 1080p
    const hls1440Dir = join(outputDir, "hls_3") // 1440p
    await mkdir(hls480Dir, { recursive: true })
    await mkdir(hls720Dir, { recursive: true })
    await mkdir(hls1080Dir, { recursive: true })
    await mkdir(hls1440Dir, { recursive: true })

    await job.updateProgress(30)

    // FFmpeg command to generate HLS with multiple qualities
    // 480p: 854x480, 800k bitrate
    // 720p: 1280x720, 2800k bitrate
    // 1080p: 1920x1080, 6000k bitrate
    // 1440p: 2560x1440, 15000k bitrate
    const ffmpegCommand = `
      ffmpeg -i "${videoPath}" \\
        -preset veryfast -g 48 -sc_threshold 0 \\
        -map 0:v:0 -map 0:a:0? \\
        -s:v:0 854x480 -c:v libx264 -b:v 800k -maxrate 800k -bufsize 1600k \\
        -s:v:1 1280x720 -c:v libx264 -b:v 2800k -maxrate 2800k -bufsize 5600k \\
        -s:v:2 1920x1080 -c:v libx264 -b:v 6000k -maxrate 6000k -bufsize 12000k \\
        -s:v:3 2560x1440 -c:v libx264 -b:v 15000k -maxrate 15000k -bufsize 30000k \\
        -c:a aac -b:a 128k \\
        -var_stream_map "v:0,a:0 v:1,a:0 v:2,a:0 v:3,a:0" \\
        -master_pl_name master.m3u8 \\
        -f hls -hls_time 4 -hls_list_size 0 \\
        -hls_segment_filename "${outputDir}/hls_%v/segment_%03d.ts" \\
        "${outputDir}/hls_%v/playlist.m3u8"
    `.trim()

    console.log(`[Job ${job.id}] Starting FFmpeg transcoding for video ${videoId}...`)
    await execAsync(ffmpegCommand)
    console.log(`[Job ${job.id}] FFmpeg transcoding completed`)
    await job.updateProgress(60)

    // Extract thumbnail at 1 second
    const thumbPath = join(outputDir, "thumb.jpg")
    const thumbCommand = `ffmpeg -i "${videoPath}" -ss 00:00:01 -vframes 1 -q:v 2 "${thumbPath}"`
    await execAsync(thumbCommand)
    console.log(`[Job ${job.id}] Thumbnail extracted`)
    await job.updateProgress(70)

    // Create blurred thumbnail
    const blurPath = join(outputDir, "blur.jpg")
    const blurCommand = `ffmpeg -i "${thumbPath}" -vf "boxblur=20:2" "${blurPath}"`
    await execAsync(blurCommand)
    console.log(`[Job ${job.id}] Blurred thumbnail created`)
    await job.updateProgress(80)

    // Upload HLS files to R2
    const hlsBaseKey = `videos/${videoId}/`
    console.log(`[Job ${job.id}] Uploading HLS files to R2...`)
    const hlsUrls = await uploadDirectoryToR2({
      dirPath: outputDir,
      baseKey: hlsBaseKey,
      fileExtensions: [".m3u8", ".ts"],
    })
    console.log(`[Job ${job.id}] Uploaded ${hlsUrls.length} HLS files`)
    await job.updateProgress(90)

    // Upload thumbnails
    const thumbKey = `thumbnails/${videoId}/thumb.jpg`
    const thumbUrl = await uploadFileToR2({
      filePath: thumbPath,
      key: thumbKey,
      contentType: "image/jpeg",
    })

    const blurKey = `thumbnails/${videoId}/blur.jpg`
    const blurUrl = await uploadFileToR2({
      filePath: blurPath,
      key: blurKey,
      contentType: "image/jpeg",
    })

    // Get master playlist URL
    const masterPlaylistUrl = getR2FileUrl(`${hlsBaseKey}master.m3u8`)

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

