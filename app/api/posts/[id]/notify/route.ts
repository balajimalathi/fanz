import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/client"
import { post, follower, notification, creator } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { env } from "@/env"

// POST - Send notification to all followers about a post
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
        { error: "Forbidden: You can only notify about your own posts" },
        { status: 403 }
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

    // Get all followers
    const followers = await db.query.follower.findMany({
      where: (f, { eq: eqOp }) => eqOp(f.creatorId, session.user.id),
    })

    if (followers.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No followers to notify",
        notificationsCreated: 0,
      })
    }

    // Create notifications for all followers
    const postLink = `${env.NEXT_PUBLIC_APP_URL}/u/${creatorRecord.username || creatorRecord.id}/post/${postId}`
    const notifications = followers.map((follower) => ({
      userId: follower.followerId,
      type: "post",
      title: `New post from ${creatorRecord.displayName}`,
      message: creatorRecord.displayName + " has posted something new!",
      link: postLink,
      read: false,
    }))

    await db.insert(notification).values(notifications)

    return NextResponse.json({
      success: true,
      notificationsCreated: notifications.length,
    })
  } catch (error) {
    console.error("Error sending notifications:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

