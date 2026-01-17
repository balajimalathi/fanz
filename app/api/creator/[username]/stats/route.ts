import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { eq, inArray, count, sql } from "drizzle-orm"
import { follower, post, postMedia, postLike } from "@/lib/db/schema"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params

    // Get creator ID from username
    const creatorRecord = await db.query.creator.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.username, username.toLowerCase()),
      columns: { id: true },
    })

    if (!creatorRecord) {
      return NextResponse.json(
        { error: "Creator not found" },
        { status: 404 }
      )
    }

    const creatorId = creatorRecord.id

    // Get follower count
    const followerResult = await db
      .select({ count: count() })
      .from(follower)
      .where(eq(follower.creatorId, creatorId))

    const followerCount = Number(followerResult[0]?.count || 0)

    // Get all post IDs for this creator
    const creatorPosts = await db
      .select({ id: post.id })
      .from(post)
      .where(eq(post.creatorId, creatorId))

    const postIds = creatorPosts.map((p) => p.id)

    // Get image and video counts
    let imageCount = 0
    let videoCount = 0

    if (postIds.length > 0) {
      const allMedia = await db.query.postMedia.findMany({
        where: (pm, { inArray: inArrayOp }) => inArrayOp(pm.postId, postIds),
      })

      imageCount = allMedia.filter((m) => m.mediaType === "image").length
      videoCount = allMedia.filter((m) => m.mediaType === "video").length
    }

    // Get total likes count across all posts
    let totalLikes = 0
    if (postIds.length > 0) {
      const likesResult = await db
        .select({ count: count() })
        .from(postLike)
        .where(inArray(postLike.postId, postIds))

      totalLikes = Number(likesResult[0]?.count || 0)
    }

    return NextResponse.json({
      followers: followerCount,
      images: imageCount,
      videos: videoCount,
      likes: totalLikes,
    })
  } catch (error) {
    console.error("Error fetching creator stats:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
