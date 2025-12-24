import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/client"
import { post, follower, notification, creator } from "@/lib/db/schema"
import { eq, inArray } from "drizzle-orm"
import { env } from "@/env"
import { z } from "zod"

const broadcastSchema = z.object({
  followerIds: z.array(z.string()).min(1, "At least one follower must be selected"),
})

// POST - Broadcast post to selected followers
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
        { error: "Forbidden: You can only broadcast your own posts" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validationResult = broadcastSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    const { followerIds } = validationResult.data

    // Verify all follower IDs belong to this creator
    const validFollowers = await db
      .select()
      .from(follower)
      .where(
        eq(follower.creatorId, session.user.id)
      )

    const validFollowerIds = validFollowers.map((f) => f.followerId)
    const invalidIds = followerIds.filter((id) => !validFollowerIds.includes(id))

    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: "One or more follower IDs are invalid" },
        { status: 400 }
      )
    }

    // Get creator info
    const creatorRecord = await db.query.creator.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, session.user.id),
    })

    if (!creatorRecord) {
      return NextResponse.json(
        { error: "Creator not found" },
        { status: 404 }
      )
    }

    // Create notifications for selected followers
    const postLink = `${env.NEXT_PUBLIC_APP_URL}/u/${creatorRecord.username || creatorRecord.id}/post/${postId}`
    const notifications = followerIds.map((followerId) => ({
      userId: followerId,
      type: "post",
      title: `New post from ${creatorRecord.displayName}`,
      message: creatorRecord.displayName + " has shared a post with you!",
      link: postLink,
      read: false,
    }))

    await db.insert(notification).values(notifications)

    return NextResponse.json({
      success: true,
      notificationsCreated: notifications.length,
    })
  } catch (error) {
    console.error("Error broadcasting post:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

