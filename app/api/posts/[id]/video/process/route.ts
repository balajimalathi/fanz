import { NextRequest, NextResponse } from "next/server"

/**
 * @deprecated This endpoint is deprecated. Video processing is now handled
 * by the BullMQ worker process. Use the job queue instead.
 * 
 * This endpoint is kept for backward compatibility but should not be used.
 * The worker process (scripts/workers/video-processor.ts) handles all processing.
 */
// POST - Process video with FFmpeg (DEPRECATED - use worker instead)
export async function POST(request: NextRequest) {
  return NextResponse.json(
    {
      error: "This endpoint is deprecated",
      message: "Video processing is now handled by the BullMQ worker process. Please ensure the worker is running.",
    },
    { status: 410 } // 410 Gone
  )
}

