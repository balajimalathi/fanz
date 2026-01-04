import { NextRequest, NextResponse } from "next/server"
import { checkAdminAccess } from "@/lib/utils/admin-auth"
import { db } from "@/lib/db/client"
import { postComment, user, post } from "@/lib/db/schema"
import { eq, desc, and, like, inArray } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const authError = await checkAdminAccess()
    if (authError) return authError

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")
    const postId = searchParams.get("postId")
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

    let whereConditions = []

    if (postId) {
      whereConditions.push(eq(postComment.postId, postId))
    }

    if (search) {
      whereConditions.push(like(postComment.content, `%${search}%`))
    }

    const comments = await db
      .select()
      .from(postComment)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(postComment.createdAt))
      .limit(limit)
      .offset(offset)

    // Get user details
    const userIds = [...new Set(comments.map((c) => c.userId))]
    const users = userIds.length > 0
      ? await db.query.user.findMany({
          where: (u, { inArray: inArrayOp }) => inArrayOp(u.id, userIds),
        })
      : []

    const userMap = new Map(users.map((u) => [u.id, u]))

    // Get post details
    const postIds = [...new Set(comments.map((c) => c.postId))]
    const posts = postIds.length > 0
      ? await db.query.post.findMany({
          where: (p, { inArray: inArrayOp }) => inArrayOp(p.id, postIds),
        })
      : []

    const postMap = new Map(posts.map((p) => [p.id, p]))

    const commentsWithDetails = comments.map((c) => {
      const userRecord = userMap.get(c.userId)
      const postRecord = postMap.get(c.postId)
      return {
        id: c.id,
        postId: c.postId,
        userId: c.userId,
        userName: userRecord?.name || "Unknown",
        userEmail: userRecord?.email || "",
        content: c.content,
        parentCommentId: c.parentCommentId,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      }
    })

    return NextResponse.json({ comments: commentsWithDetails })
  } catch (error) {
    console.error("Error fetching comments:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authError = await checkAdminAccess()
    if (authError) return authError

    const { searchParams } = new URL(request.url)
    const commentId = searchParams.get("commentId")

    if (!commentId) {
      return NextResponse.json(
        { error: "commentId is required" },
        { status: 400 }
      )
    }

    // Delete comment (cascade will handle replies)
    await db.delete(postComment).where(eq(postComment.id, commentId))

    return NextResponse.json({ success: true, message: "Comment deleted" })
  } catch (error) {
    console.error("Error deleting comment:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

