import { NextRequest, NextResponse } from "next/server"
import { checkAdminAccess } from "@/lib/utils/admin-auth"
import { db } from "@/lib/db/client"
import { postComment, user, post } from "@/lib/db/schema"
import { eq, desc, asc, and, like, inArray, count } from "drizzle-orm"
import { AdminListResponse } from "@/types/admin-table"

export async function GET(request: NextRequest) {
  try {
    const authError = await checkAdminAccess()
    if (authError) return authError

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")
    const postId = searchParams.get("postId")
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "10")
    const sortBy = searchParams.get("sortBy") || "createdAt"
    const sortOrder = searchParams.get("sortOrder") || "desc"
    
    const limit = pageSize
    const offset = (page - 1) * pageSize

    let whereConditions = []

    if (postId) {
      whereConditions.push(eq(postComment.postId, postId))
    }

    if (search) {
      whereConditions.push(like(postComment.content, `%${search}%`))
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined

    // Get total count
    const [{ totalCount }] = await db
      .select({ totalCount: count() })
      .from(postComment)
      .where(whereClause)

    // Determine sort order
    const orderByClause = sortOrder === "asc" 
      ? asc(postComment.createdAt)
      : desc(postComment.createdAt)

    const comments = await db
      .select()
      .from(postComment)
      .where(whereClause)
      .orderBy(orderByClause)
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

    const response: AdminListResponse<typeof commentsWithDetails[0]> = {
      rows: commentsWithDetails,
      total: totalCount,
    }

    return NextResponse.json(response)
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

