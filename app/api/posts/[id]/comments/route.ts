import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/client"
import { post, postComment, user } from "@/lib/db/schema"
import { eq, and, isNull, asc } from "drizzle-orm"
import { z } from "zod"

const createCommentSchema = z.object({
  content: z.string().min(1).max(1000),
  parentCommentId: z.string().uuid().optional(),
})

// GET - Fetch comments for a post
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

    // Fetch all comments for this post
    const comments = await db.query.postComment.findMany({
      where: (pc, { eq: eqOp }) => eqOp(pc.postId, postId),
      orderBy: (pc, { asc: ascOp }) => [ascOp(pc.createdAt)],
    })

    // Fetch user info for all comments
    const userIds = [...new Set(comments.map((c) => c.userId))]
    const users = await db.query.user.findMany({
      where: (u, { inArray: inArrayOp }) => inArrayOp(u.id, userIds),
    })

    const userMap = new Map(users.map((u) => [u.id, u]))

    // Build nested comment structure
    const commentMap = new Map(
      comments.map((c) => [
        c.id,
        {
          id: c.id,
          postId: c.postId,
          userId: c.userId,
          content: c.content,
          parentCommentId: c.parentCommentId,
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
          user: userMap.get(c.userId)
            ? {
                id: userMap.get(c.userId)!.id,
                name: userMap.get(c.userId)!.name,
                image: userMap.get(c.userId)!.image,
              }
            : null,
          replies: [] as any[],
        },
      ])
    )

    // Build tree structure
    const rootComments: any[] = []
    commentMap.forEach((comment) => {
      if (!comment.parentCommentId) {
        rootComments.push(comment)
      } else {
        const parent = commentMap.get(comment.parentCommentId)
        if (parent) {
          parent.replies.push(comment)
        }
      }
    })

    return NextResponse.json({
      comments: rootComments,
      totalCount: comments.length,
    })
  } catch (error) {
    console.error("Error fetching comments:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - Create a comment
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

    const body = await request.json()
    const validationResult = createCommentSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    const { content, parentCommentId } = validationResult.data

    // If parentCommentId is provided, verify it exists and belongs to this post
    if (parentCommentId) {
      const parentComment = await db.query.postComment.findFirst({
        where: (pc, { eq: eqOp, and: andOp }) =>
          andOp(eqOp(pc.id, parentCommentId), eqOp(pc.postId, postId)),
      })

      if (!parentComment) {
        return NextResponse.json(
          { error: "Parent comment not found" },
          { status: 404 }
        )
      }
    }

    // Create comment
    const [newComment] = await db
      .insert(postComment)
      .values({
        postId,
        userId: session.user.id,
        content,
        parentCommentId: parentCommentId || null,
      })
      .returning()

    // Fetch user info
    const userRecord = await db.query.user.findFirst({
      where: (u, { eq: eqOp }) => eqOp(u.id, session.user.id),
    })

    return NextResponse.json(
      {
        id: newComment.id,
        postId: newComment.postId,
        userId: newComment.userId,
        content: newComment.content,
        parentCommentId: newComment.parentCommentId,
        createdAt: newComment.createdAt.toISOString(),
        updatedAt: newComment.updatedAt.toISOString(),
        user: userRecord
          ? {
              id: userRecord.id,
              name: userRecord.name,
              image: userRecord.image,
            }
          : null,
        replies: [],
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating comment:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

