import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/client"
import { post } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

// POST - Toggle pinned status of a post
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
        { error: "Forbidden: You can only pin your own posts" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { isPinned } = body

    if (typeof isPinned !== "boolean") {
      return NextResponse.json(
        { error: "isPinned must be a boolean" },
        { status: 400 }
      )
    }

    // If pinning, unpin all other posts first (only one pinned post per creator)
    if (isPinned) {
      await db
        .update(post)
        .set({ isPinned: false })
        .where(eq(post.creatorId, session.user.id))
    }

    // Update the post
    const [updatedPost] = await db
      .update(post)
      .set({
        isPinned,
        updatedAt: new Date(),
      })
      .where(eq(post.id, postId))
      .returning()

    return NextResponse.json({
      success: true,
      post: updatedPost,
    })
  } catch (error) {
    console.error("Error pinning post:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

