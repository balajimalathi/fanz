import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { getJobStatus } from "@/lib/queue/video-processing"

// GET - Get video processing status
export async function GET(
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

    const { id: postId } = await params
    const mediaId = request.nextUrl.searchParams.get("mediaId")

    if (!mediaId) {
      return NextResponse.json(
        { error: "mediaId query parameter is required" },
        { status: 400 }
      )
    }

    const jobId = `video-${mediaId}`
    const status = await getJobStatus(jobId)

    if (!status) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(status)
  } catch (error) {
    console.error("Error getting job status:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

