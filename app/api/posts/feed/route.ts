import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/client"
import { post, postMedia, creator, postLike, postComment } from "@/lib/db/schema"
import { eq, desc, and, sql, lt, or, inArray } from "drizzle-orm"

// GET - Fetch feed posts for authenticated creator (their own posts)
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get("cursor")
    const limit = parseInt(searchParams.get("limit") || "10", 10)

    // Get creator ID (same as user ID)
    const creatorId = session.user.id

    // Verify creator exists
    const creatorRecord = await db.query.creator.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, creatorId),
    })

    if (!creatorRecord) {
      return NextResponse.json({
        posts: [],
        nextCursor: null,
        hasMore: false,
      })
    }

    // Build where conditions - only posts from this creator
    let whereCondition = eq(post.creatorId, creatorId)

    // Apply cursor if provided
    if (cursor) {
      // Parse cursor (format: "timestamp_uuid")
      const [timestampStr, cursorPostId] = cursor.split("_")
      
      // Get the cursor post to compare properly
      const cursorPost = await db.query.post.findFirst({
        where: (p, { eq: eqOp }) => eqOp(p.id, cursorPostId),
      })

      if (cursorPost) {
        // Verify cursor post belongs to this creator
        if (cursorPost.creatorId !== creatorId) {
          return NextResponse.json({
            posts: [],
            nextCursor: null,
            hasMore: false,
          })
        }

        // For cursor pagination with pinned posts:
        // - If cursor post is pinned, show only pinned posts created before it
        // - If cursor post is not pinned, show only non-pinned posts created before it
        // This ensures we maintain the pinned-first ordering
        if (cursorPost.isPinned) {
          // Continue with pinned posts only
          const pinnedCondition = or(
            lt(post.createdAt, cursorPost.createdAt),
            and(
              eq(post.createdAt, cursorPost.createdAt),
              sql`${post.id}::text < ${cursorPostId}`
            )
          )
          whereCondition = and(
            eq(post.creatorId, creatorId),
            eq(post.isPinned, true),
            pinnedCondition
          )!
        } else {
          // Show non-pinned posts created before cursor
          const nonPinnedCondition = or(
            lt(post.createdAt, cursorPost.createdAt),
            and(
              eq(post.createdAt, cursorPost.createdAt),
              sql`${post.id}::text < ${cursorPostId}`
            )
          )
          const pinnedOrNonPinned = or(
            eq(post.isPinned, true), // Still include all pinned posts
            and(
              eq(post.isPinned, false),
              nonPinnedCondition
            )
          )
          whereCondition = and(
            eq(post.creatorId, creatorId),
            pinnedOrNonPinned
          )!
        }
      }
    }

    // Fetch posts with proper ordering
    const posts = await db
      .select({
        id: post.id,
        creatorId: post.creatorId,
        caption: post.caption,
        postType: post.postType,
        price: post.price,
        isPinned: post.isPinned,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
      })
      .from(post)
      .where(whereCondition)
      .orderBy(desc(post.isPinned), desc(post.createdAt))
      .limit(limit + 1) // Fetch one extra to check if there's more

    // Check if there are more posts
    const hasMore = posts.length > limit
    const postsToReturn = hasMore ? posts.slice(0, limit) : posts

    if (postsToReturn.length === 0) {
      return NextResponse.json({
        posts: [],
        nextCursor: null,
        hasMore: false,
      })
    }

    // Fetch additional data for each post
    const postIds = postsToReturn.map((p) => p.id)

    // Fetch media for all posts
    const allMedia = await db.query.postMedia.findMany({
      where: (pm, { inArray: inArrayOp }) => inArrayOp(pm.postId, postIds),
      orderBy: (pm, { asc }) => [asc(pm.orderIndex)],
    })

    // Fetch creator info (only one creator since all posts are from the same creator)
    const creatorInfo = await db.query.creator.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, creatorId),
    })

    // Fetch like counts
    const likeCounts = await db
      .select({
        postId: postLike.postId,
        count: sql<number>`count(*)::int`,
      })
      .from(postLike)
      .where(inArray(postLike.postId, postIds))
      .groupBy(postLike.postId)

    // Fetch comment counts
    const commentCounts = await db
      .select({
        postId: postComment.postId,
        count: sql<number>`count(*)::int`,
      })
      .from(postComment)
      .where(inArray(postComment.postId, postIds))
      .groupBy(postComment.postId)

    // Check which posts user has liked
    const userLikes = await db.query.postLike.findMany({
      where: (pl, { eq: eqOp, inArray: inArrayOp }) =>
        and(eqOp(pl.userId, session.user.id), inArrayOp(pl.postId, postIds)),
    })

    const likedPostIds = new Set(userLikes.map((l) => l.postId))

    // Create maps for quick lookup
    const mediaMap = new Map<string, typeof allMedia>()
    allMedia.forEach((media) => {
      const existing = mediaMap.get(media.postId) || []
      existing.push(media)
      mediaMap.set(media.postId, existing)
    })

    const likeCountMap = new Map(likeCounts.map((lc) => [lc.postId, lc.count]))
    const commentCountMap = new Map(commentCounts.map((cc) => [cc.postId, cc.count]))

    // Build response - creator always has access to their own posts
    const postsWithDetails = postsToReturn.map((p) => {
      const media = mediaMap.get(p.id) || []
      const likeCount = likeCountMap.get(p.id) || 0
      const commentCount = commentCountMap.get(p.id) || 0
      const isLiked = likedPostIds.has(p.id)

      return {
        id: p.id,
        creator: creatorInfo
          ? {
              id: creatorInfo.id,
              username: creatorInfo.username,
              displayName: creatorInfo.displayName,
              profileImageUrl: creatorInfo.profileImageUrl,
            }
          : null,
        caption: p.caption,
        postType: p.postType,
        price: p.price ? p.price / 100 : null, // Convert paise to rupees
        isPinned: p.isPinned,
        media: media.map((m) => ({
          id: m.id,
          mediaType: m.mediaType,
          url: m.url,
          thumbnailUrl: m.thumbnailUrl,
          hlsUrl: m.hlsUrl,
          blurThumbnailUrl: m.blurThumbnailUrl,
          metadata: m.metadata,
          orderIndex: m.orderIndex,
        })),
        likeCount,
        commentCount,
        isLiked,
        hasAccess: true, // Creator always has access to their own posts
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      }
    })

    // Generate next cursor from last post
    const lastPost = postsToReturn[postsToReturn.length - 1]
    const nextCursor = hasMore
      ? `${lastPost.createdAt.getTime()}_${lastPost.id}`
      : null

    return NextResponse.json({
      posts: postsWithDetails,
      nextCursor,
      hasMore,
    })
  } catch (error) {
    console.error("Error fetching feed:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

