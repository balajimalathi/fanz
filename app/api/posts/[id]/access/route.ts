import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { hasAccessToPost } from "@/lib/utils/subscription-access"

// GET - Check if user has access to a post
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
        { hasAccess: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id: postId } = await params
    const hasAccess = await hasAccessToPost(session.user.id, postId)

    return NextResponse.json({ hasAccess })
  } catch (error) {
    console.error("Error checking access:", error)
    return NextResponse.json(
      { hasAccess: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

