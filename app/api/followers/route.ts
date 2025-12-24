import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/client"
import { follower, user } from "@/lib/db/schema"
import { eq, inArray } from "drizzle-orm"

// GET - Fetch followers for a creator
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

    // Check if user has creator role
    if (session.user.role !== "creator") {
      return NextResponse.json(
        { error: "Forbidden: Creator role required" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const creatorId = searchParams.get("creatorId")

    if (!creatorId) {
      return NextResponse.json(
        { error: "creatorId is required" },
        { status: 400 }
      )
    }

    // Verify the creatorId belongs to the authenticated user
    if (creatorId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden: You can only view your own followers" },
        { status: 403 }
      )
    }

    // Fetch followers
    const followers = await db.query.follower.findMany({
      where: (f, { eq: eqOp }) => eqOp(f.creatorId, creatorId),
    })

    // Fetch user details for each follower
    const followerIds = followers.map((f) => f.followerId)
    const users = followerIds.length > 0
      ? await db.select().from(user).where(inArray(user.id, followerIds))
      : []

    // Create a map for quick lookup
    const userMap = new Map(users.map((u) => [u.id, u]))

    // Transform the response
    const followersData = followers.map((f) => {
      const user = userMap.get(f.followerId)
      return {
        id: f.id,
        followerId: f.followerId,
        followerName: user?.name || "Unknown",
        followerEmail: user?.email || "",
        createdAt: f.createdAt,
      }
    })

    return NextResponse.json(followersData)
  } catch (error) {
    console.error("Error fetching followers:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

