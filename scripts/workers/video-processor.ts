#!/usr/bin/env node

/**
 * Video Processing Worker
 * 
 * This script runs as a separate process to handle video transcoding jobs.
 * Run with: pnpm worker:video
 * 
 * In production, run this as a background service (PM2, systemd, etc.)
 */

// Load environment variables before importing anything that needs them
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { Worker } from "bullmq" 
import { processVideoJob } from "@/lib/workers/video-processor-handler"

// Redis connection configuration
const connection = {
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || "0"),
}

// Worker configuration
const worker = new Worker(
  "video-processing",
  async (job) => {
    return await processVideoJob(job)
  },
  {
    connection,
    concurrency: 2, // Process 2 videos concurrently (adjust based on server capacity)
    limiter: {
      max: 10, // Max 10 jobs per duration
      duration: 60000, // Per 60 seconds
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  }
)

// Worker event handlers
worker.on("completed", (job) => {
  console.log(`✅ Job ${job.id} completed successfully`)
})

worker.on("failed", (job, err) => {
  console.error(`❌ Job ${job?.id} failed:`, err.message)
})

worker.on("error", (err) => {
  console.error("❌ Worker error:", err)
})

worker.on("stalled", (jobId) => {
  console.warn(`⚠️  Job ${jobId} stalled`)
})

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, closing worker...")
  await worker.close()
  process.exit(0)
})

process.on("SIGINT", async () => {
  console.log("SIGINT received, closing worker...")
  await worker.close()
  process.exit(0)
})

console.log("🚀 Video processing worker started")
console.log(`📊 Concurrency: ${worker.opts.concurrency}`)
console.log(`🔗 Redis: ${connection.host}:${connection.port}`)

