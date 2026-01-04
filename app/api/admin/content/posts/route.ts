import { NextRequest, NextResponse } from "next/server"
import { checkAdminAccess } from "@/lib/utils/admin-auth"
import { db } from "@/lib/db/client"
import { post, creator, postMedia } from "@/lib/db/schema"
import { eq, desc, and, or, like, inArray } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const authError = await checkAdminAccess()
    if (authError) return authError

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")
    const creatorId = searchParams.get("creatorId")
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

    let whereConditions = []

    if (creatorId) {
      whereConditions.push(eq(post.creatorId, creatorId))
    }

    if (search) {
      // Search in caption
      whereConditions.push(like(post.caption, `%${search}%`))
    }

    const posts = await db
      .select()
      .from(post)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(post.createdAt))
      .limit(limit)
      .offset(offset)

    // Get creator details
    const creatorIds = [...new Set(posts.map((p) => p.creatorId))]
    const creators = creatorIds.length > 0
      ? await db.query.creator.findMany({
          where: (c, { inArray: inArrayOp }) => inArrayOp(c.id, creatorIds),
        })
      : []

    const creatorMap = new Map(creators.map((c) => [c.id, c]))

    // Get media for each post
    const postIds = posts.map((p) => p.id)
    const media = postIds.length > 0
      ? await db.query.postMedia.findMany({
          where: (pm, { inArray: inArrayOp }) => inArrayOp(pm.postId, postIds),
        })
      : []

    const mediaMap = new Map<string, typeof media>()
    media.forEach((m) => {
      if (!mediaMap.has(m.postId)) {
        mediaMap.set(m.postId, [])
      }
      mediaMap.get(m.postId)!.push(m)
    })

    const postsWithDetails = posts.map((p) => {
      const creatorRecord = creatorMap.get(p.creatorId)
      return {
        id: p.id,
        creatorId: p.creatorId,
        creatorName: creatorRecord?.displayName || "Unknown",
        creatorUsername: creatorRecord?.username || null,
        caption: p.caption,
        postType: p.postType,
        price: p.price ? p.price / 100 : null,
        isPinned: p.isPinned,
        media: mediaMap.get(p.id) || [],
        createdAt: p.createdAt.toISOString(),
      }
    })

    return NextResponse.json({ posts: postsWithDetails })
  } catch (error) {
    console.error("Error fetching posts:", error)
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
    const postId = searchParams.get("postId")

    if (!postId) {
      return NextResponse.json(
        { error: "postId is required" },
        { status: 400 }
      )
    }

    // Delete post (cascade will handle media)
    await db.delete(post).where(eq(post.id, postId))

    return NextResponse.json({ success: true, message: "Post deleted" })
  } catch (error) {
    console.error("Error deleting post:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

