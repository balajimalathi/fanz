import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/client"
import { post, postComment } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { z } from "zod"

const updateCommentSchema = z.object({
  content: z.string().min(1).max(1000),
})

// PATCH - Update a comment
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
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

    const { id: postId, commentId } = await params

    // Verify comment exists and belongs to user
    const comment = await db.query.postComment.findFirst({
      where: (pc, { eq: eqOp, and: andOp }) =>
        andOp(eqOp(pc.id, commentId), eqOp(pc.postId, postId)),
    })

    if (!comment) {
      return NextResponse.json(
        { error: "Comment not found" },
        { status: 404 }
      )
    }

    if (comment.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden: You can only edit your own comments" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validationResult = updateCommentSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    // Update comment
    const [updatedComment] = await db
      .update(postComment)
      .set({
        content: validationResult.data.content,
        updatedAt: new Date(),
      })
      .where(eq(postComment.id, commentId))
      .returning()

    return NextResponse.json({
      id: updatedComment.id,
      postId: updatedComment.postId,
      userId: updatedComment.userId,
      content: updatedComment.content,
      parentCommentId: updatedComment.parentCommentId,
      createdAt: updatedComment.createdAt.toISOString(),
      updatedAt: updatedComment.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error("Error updating comment:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE - Delete a comment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
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

    const { id: postId, commentId } = await params

    // Verify comment exists
    const comment = await db.query.postComment.findFirst({
      where: (pc, { eq: eqOp, and: andOp }) =>
        andOp(eqOp(pc.id, commentId), eqOp(pc.postId, postId)),
    })

    if (!comment) {
      return NextResponse.json(
        { error: "Comment not found" },
        { status: 404 }
      )
    }

    // Verify post exists to check if user is creator
    const postRecord = await db.query.post.findFirst({
      where: (p, { eq: eqOp }) => eqOp(p.id, postId),
    })

    // Allow deletion if user owns comment OR user is post creator
    const canDelete =
      comment.userId === session.user.id ||
      postRecord?.creatorId === session.user.id

    if (!canDelete) {
      return NextResponse.json(
        { error: "Forbidden: You can only delete your own comments or comments on your posts" },
        { status: 403 }
      )
    }

    // Delete comment (cascade will handle replies)
    await db.delete(postComment).where(eq(postComment.id, commentId))

    return NextResponse.json({
      success: true,
      message: "Comment deleted",
    })
  } catch (error) {
    console.error("Error deleting comment:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

