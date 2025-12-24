import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/client"
import { post, creator } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { env } from "@/env"

// GET - Get shareable link for a post
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
        { error: "Forbidden: You can only get links for your own posts" },
        { status: 403 }
      )
    }

    // Get creator info
    const creatorRecord = await db.query.creator.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, session.user.id),
    })

    if (!creatorRecord) {
      return NextResponse.json(
        { error: "Creator not found" },
        { status: 404 }
      )
    }

    const postLink = `${env.NEXT_PUBLIC_APP_URL}/u/${creatorRecord.username || creatorRecord.id}/post/${postId}`

    return NextResponse.json({
      link: postLink,
    })
  } catch (error) {
    console.error("Error getting post link:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

