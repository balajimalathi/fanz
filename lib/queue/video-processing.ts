import { Queue, QueueOptions } from "bullmq"
import { env } from "@/env"

// Redis connection configuration
const connection = {
  host: env.REDIS_HOST,
  port: parseInt(env.REDIS_PORT),
  password: env.REDIS_PASSWORD,
  db: parseInt(env.REDIS_DB),
}

// Queue options with production-ready settings
const queueOptions: QueueOptions = {
  connection,
  defaultJobOptions: {
    attempts: 3, // Retry up to 3 times
    backoff: {
      type: "exponential",
      delay: 2000, // Start with 2 seconds, then 4s, 8s...
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000, // Keep last 1000 completed jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days for debugging
    },
  },
}

// Create the video processing queue
export const videoProcessingQueue = new Queue("video-processing", queueOptions)

// Job data interface
export interface VideoProcessingJobData {
  mediaId: string
  videoPath: string
  videoId: string
  postId: string
}

/**
 * Add a video processing job to the queue
 */
export async function enqueueVideoProcessing(data: VideoProcessingJobData) {
  return await videoProcessingQueue.add("process-video", data, {
    jobId: `video-${data.mediaId}`, // Unique job ID to prevent duplicates
    priority: 1, // Higher priority = processed first
  })
}

/**
 * Get job status
 */
export async function getJobStatus(jobId: string) {
  const job = await videoProcessingQueue.getJob(jobId)
  if (!job) {
    return null
  }

  const state = await job.getState()
  const progress = job.progress
  const returnValue = job.returnvalue
  const failedReason = job.failedReason

  return {
    id: job.id,
    state,
    progress,
    returnValue,
    failedReason,
    timestamp: job.timestamp,
  }
}

/**
 * Clean up queue connection
 */
export async function closeQueue() {
  await videoProcessingQueue.close()
}

