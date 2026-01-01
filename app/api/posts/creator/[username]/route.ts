import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/client"
import { post, postMedia, creator, postLike, postComment, postMembership } from "@/lib/db/schema"
import { eq, desc, and, sql, lt, or, inArray } from "drizzle-orm"
import { hasAccessToPost } from "@/lib/utils/subscription-access"

// GET - Fetch posts for a specific creator by username
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get("cursor")
    const limit = parseInt(searchParams.get("limit") || "10", 10)

    // Fetch creator by username
    const creatorRecord = await db.query.creator.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.username, username.toLowerCase()),
    })

    if (!creatorRecord || !creatorRecord.onboarded) {
      return NextResponse.json(
        { error: "Creator not found" },
        { status: 404 }
      )
    }

    const creatorId = creatorRecord.id

    // Build where conditions - only posts from this creator
    let whereCondition = eq(post.creatorId, creatorId)

    // Apply cursor if provided
    if (cursor) {
      const [timestampStr, cursorPostId] = cursor.split("_")
      
      const cursorPost = await db.query.post.findFirst({
        where: (p, { eq: eqOp }) => eqOp(p.id, cursorPostId),
      })

      if (cursorPost && cursorPost.creatorId === creatorId) {
        if (cursorPost.isPinned) {
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
          const nonPinnedCondition = or(
            lt(post.createdAt, cursorPost.createdAt),
            and(
              eq(post.createdAt, cursorPost.createdAt),
              sql`${post.id}::text < ${cursorPostId}`
            )
          )
          const pinnedOrNonPinned = or(
            eq(post.isPinned, true),
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
      .limit(limit + 1)

    const hasMore = posts.length > limit
    const postsToReturn = hasMore ? posts.slice(0, limit) : posts

    if (postsToReturn.length === 0) {
      return NextResponse.json({
        posts: [],
        nextCursor: null,
        hasMore: false,
      })
    }

    const postIds = postsToReturn.map((p) => p.id)

    // Fetch post memberships to check which posts require membership
    const allPostMemberships = await db.query.postMembership.findMany({
      where: (pm, { inArray: inArrayOp }) => inArrayOp(pm.postId, postIds),
    })

    const postMembershipMap = new Map<string, boolean>()
    allPostMemberships.forEach((pm) => {
      postMembershipMap.set(pm.postId, true)
    })

    // Fetch media for all posts
    const allMedia = await db.query.postMedia.findMany({
      where: (pm, { inArray: inArrayOp }) => inArrayOp(pm.postId, postIds),
      orderBy: (pm, { asc }) => [asc(pm.orderIndex)],
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

    // Check which posts user has liked (if authenticated)
    let likedPostIds = new Set<string>()
    if (session?.user) {
      const userLikes = await db.query.postLike.findMany({
        where: (pl, { eq: eqOp, inArray: inArrayOp }) =>
          and(eqOp(pl.userId, session.user.id), inArrayOp(pl.postId, postIds)),
      })
      likedPostIds = new Set(userLikes.map((l) => l.postId))
    }

    // Create maps for quick lookup
    const mediaMap = new Map<string, typeof allMedia>()
    allMedia.forEach((media) => {
      const existing = mediaMap.get(media.postId) || []
      existing.push(media)
      mediaMap.set(media.postId, existing)
    })

    const likeCountMap = new Map(likeCounts.map((lc) => [lc.postId, lc.count]))
    const commentCountMap = new Map(commentCounts.map((cc) => [cc.postId, cc.count]))

    // Check access for each post and filter based on rules
    const postsWithAccess: Array<{
      id: string
      creator: {
        id: string
        username: string | null
        displayName: string
        profileImageUrl: string | null
      } | null
      caption: string | null
      postType: "subscription" | "exclusive"
      price: number | null
      isPinned: boolean
      media: Array<{
        id: string
        mediaType: "image" | "video"
        url: string | null
        thumbnailUrl: string | null
        hlsUrl: string | null
        blurThumbnailUrl: string | null
        metadata?: Record<string, unknown>
        orderIndex: number
      }>
      likeCount: number
      commentCount: number
      isLiked: boolean
      hasAccess: boolean
      createdAt: string
      updatedAt: string
    }> = []

    for (const p of postsToReturn) {
      const hasMemberships = postMembershipMap.has(p.id)
      let hasAccess = false

      if (!session?.user) {
        // Not logged in: return all posts with hasAccess: false
        hasAccess = false
      } else {
        // Logged in: check access
        // For exclusive posts, check purchase
        // For subscription posts, check membership
        hasAccess = await hasAccessToPost(session.user.id, p.id)
      }

      const media = mediaMap.get(p.id) || []
      const likeCount = likeCountMap.get(p.id) || 0
      const commentCount = commentCountMap.get(p.id) || 0
      const isLiked = likedPostIds.has(p.id)

      // Filter media URLs based on access - server-side security
      const filteredMedia = media.map((m) => {
        if (hasAccess) {
          // User has access - return all URLs
          return {
            id: m.id,
            mediaType: m.mediaType,
            url: m.url,
            thumbnailUrl: m.thumbnailUrl,
            hlsUrl: m.hlsUrl,
            blurThumbnailUrl: m.blurThumbnailUrl,
            ...(m.metadata ? { metadata: m.metadata } : {}),
            orderIndex: m.orderIndex,
          }
        } else {
          // User doesn't have access - only return blur thumbnail (never expose original URLs)
          if (m.mediaType === "image") {
            return {
              id: m.id,
              mediaType: m.mediaType,
              url: m.blurThumbnailUrl || null, // Only blur thumbnail, no fallback
              thumbnailUrl: null,
              hlsUrl: null,
              blurThumbnailUrl: m.blurThumbnailUrl || null, // Only blur thumbnail
              ...(m.metadata ? { metadata: m.metadata } : {}),
              orderIndex: m.orderIndex,
            }
          } else {
            // Video - return blur thumbnail as poster
            return {
              id: m.id,
              mediaType: m.mediaType,
              url: null, // Don't expose video URL
              thumbnailUrl: m.blurThumbnailUrl || null, // Only blur thumbnail, no fallback
              hlsUrl: null, // Don't expose HLS URL
              blurThumbnailUrl: m.blurThumbnailUrl || null, // Only blur thumbnail
              ...(m.metadata ? { metadata: m.metadata } : {}),
              orderIndex: m.orderIndex,
            }
          }
        }
      })

      postsWithAccess.push({
        id: p.id,
        creator: {
          id: creatorRecord.id,
          username: creatorRecord.username,
          displayName: creatorRecord.displayName,
          profileImageUrl: creatorRecord.profileImageUrl,
        },
        caption: p.caption,
        postType: p.postType,
        price: p.price ? p.price / 100 : null,
        isPinned: p.isPinned,
        media: filteredMedia,
        likeCount,
        commentCount,
        isLiked,
        hasAccess,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })
    }

    // Generate next cursor from last post
    const lastPost = postsToReturn[postsToReturn.length - 1]
    const nextCursor = hasMore && postsWithAccess.length > 0
      ? `${lastPost.createdAt.getTime()}_${lastPost.id}`
      : null

    return NextResponse.json({
      posts: postsWithAccess,
      nextCursor,
      hasMore: hasMore && postsWithAccess.length > 0,
    })
  } catch (error) {
    console.error("Error fetching creator posts:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

