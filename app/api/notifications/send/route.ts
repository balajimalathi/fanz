import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/client"
import { notification, follower, creator } from "@/lib/db/schema"
import { eq, inArray } from "drizzle-orm"
import { sendPushNotificationsToUsers } from "@/lib/push/fcm"
import { env } from "@/env"

/**
 * Creator-to-Follower Notification API
 * 
 * This endpoint handles notifications from creators to their followers.
 * It uses Firebase push notifications to deliver real-time notifications.
 * 
 * Note: Admin-to-creator notifications will be handled separately
 * with DB storage + email (to be implemented later).
 */

interface SendNotificationRequest {
  title: string
  message: string
  link?: string
  followerIds?: string[] // If not provided or empty, send to all followers
  sendToAll?: boolean
}

export async function POST(request: NextRequest) {
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

    const body: SendNotificationRequest = await request.json()
    const { title, message, link, followerIds, sendToAll } = body

    // Validate required fields
    if (!title || !message) {
      return NextResponse.json(
        { error: "Title and message are required" },
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

    // Get followers
    let targetFollowerIds: string[] = []

    if (sendToAll || !followerIds || followerIds.length === 0) {
      // Get all followers
      const allFollowers = await db.query.follower.findMany({
        where: (f, { eq: eqOp }) => eqOp(f.creatorId, session.user.id),
      })
      targetFollowerIds = allFollowers.map((f) => f.followerId)
    } else {
      // Verify all provided follower IDs belong to this creator
      const validFollowers = await db
        .select()
        .from(follower)
        .where(eq(follower.creatorId, session.user.id))

      const validFollowerIds = validFollowers.map((f) => f.followerId)
      const invalidIds = followerIds.filter((id) => !validFollowerIds.includes(id))

      if (invalidIds.length > 0) {
        return NextResponse.json(
          { error: "One or more follower IDs are invalid" },
          { status: 400 }
        )
      }

      targetFollowerIds = followerIds
    }

    if (targetFollowerIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No followers to notify",
        notificationsCreated: 0,
        pushNotificationsSent: 0,
        pushNotificationsFailed: 0,
      })
    }

    // Create notification link if not provided
    const notificationLink = link || `${env.NEXT_PUBLIC_APP_URL}/u/${creatorRecord.username || creatorRecord.id}`

    // Create notifications for selected followers
    const notifications = targetFollowerIds.map((followerId) => ({
      userId: followerId,
      type: "announcement",
      title,
      message,
      link: notificationLink,
      read: false,
    }))

    await db.insert(notification).values(notifications)

    // Send Firebase push notifications to followers
    // This is the primary delivery method for creator-to-follower notifications
    console.log(`[Notification Send] Sending push notifications to ${targetFollowerIds.length} follower(s)`)
    const pushResult = await sendPushNotificationsToUsers(targetFollowerIds, {
      title,
      body: message,
      icon: creatorRecord.profileImageUrl || undefined,
      click_action: notificationLink,
      data: {
        type: "announcement",
        creatorId: session.user.id,
        link: notificationLink,
      },
    })

    // Log detailed results
    console.log(`[Notification Send] Push notification results:`, {
      sent: pushResult.sent,
      failed: pushResult.failed,
      errors: pushResult.errors,
    })

    return NextResponse.json({
      success: true,
      message: `Notification sent to ${targetFollowerIds.length} follower${targetFollowerIds.length !== 1 ? "s" : ""}`,
      notificationsCreated: notifications.length,
      pushNotificationsSent: pushResult.sent,
      pushNotificationsFailed: pushResult.failed,
      errors: pushResult.errors || undefined,
      debug: {
        targetFollowerCount: targetFollowerIds.length,
        pushResult,
      },
    })
  } catch (error) {
    console.error("Error sending notifications:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

