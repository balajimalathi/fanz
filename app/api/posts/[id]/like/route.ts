import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/client"
import { post, postLike } from "@/lib/db/schema"
import { eq, and, sql } from "drizzle-orm"

// POST - Like a post
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

    const { id: postId } = await params

    // Verify post exists
    const postRecord = await db.query.post.findFirst({
      where: (p, { eq: eqOp }) => eqOp(p.id, postId),
    })

    if (!postRecord) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      )
    }

    // Check if already liked (idempotent)
    const existingLike = await db.query.postLike.findFirst({
      where: (pl, { eq: eqOp, and: andOp }) =>
        andOp(eqOp(pl.postId, postId), eqOp(pl.userId, session.user.id)),
    })

    if (existingLike) {
      // Already liked, return current count
      const likeCount = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(postLike)
        .where(eq(postLike.postId, postId))

      return NextResponse.json({
        success: true,
        liked: true,
        likeCount: likeCount[0]?.count || 0,
      })
    }

    // Create like
    await db.insert(postLike).values({
      postId,
      userId: session.user.id,
    })

    // Get updated like count
    const likeCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(postLike)
      .where(eq(postLike.postId, postId))

    return NextResponse.json({
      success: true,
      liked: true,
      likeCount: likeCount[0]?.count || 0,
    })
  } catch (error: any) {
    // Handle unique constraint violation (already liked)
    if (error.code === "23505") {
      const likeCount = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(postLike)
        .where(eq(postLike.postId, (await params).id))

      return NextResponse.json({
        success: true,
        liked: true,
        likeCount: likeCount[0]?.count || 0,
      })
    }

    console.error("Error liking post:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE - Unlike a post
export async function DELETE(
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

    // Delete like
    await db
      .delete(postLike)
      .where(
        and(
          eq(postLike.postId, postId),
          eq(postLike.userId, session.user.id)
        )
      )

    // Get updated like count
    const likeCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(postLike)
      .where(eq(postLike.postId, postId))

    return NextResponse.json({
      success: true,
      liked: false,
      likeCount: likeCount[0]?.count || 0,
    })
  } catch (error) {
    console.error("Error unliking post:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

