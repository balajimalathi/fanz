import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { follower, creator } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// POST - Follow a creator
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ creatorId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { creatorId } = await params;

    // Verify creator exists
    const creatorRecord = await db.query.creator.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, creatorId),
    });

    if (!creatorRecord) {
      return NextResponse.json(
        { error: "Creator not found" },
        { status: 404 }
      );
    }

    // Check if already following
    const existingFollow = await db.query.follower.findFirst({
      where: (f, { eq: eqOp, and: andOp }) =>
        andOp(
          eqOp(f.followerId, session.user.id),
          eqOp(f.creatorId, creatorId)
        ),
    });

    if (existingFollow) {
      return NextResponse.json(
        { error: "Already following this creator" },
        { status: 400 }
      );
    }

    // Create follow relationship
    await db.insert(follower).values({
      followerId: session.user.id,
      creatorId: creatorId,
    });

    // Get updated follower count
    const followerCount = await db
      .select()
      .from(follower)
      .where(eq(follower.creatorId, creatorId));

    return NextResponse.json({
      success: true,
      following: true,
      followerCount: followerCount.length,
    });
  } catch (error) {
    console.error("Error following creator:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Unfollow a creator
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ creatorId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { creatorId } = await params;

    // Delete follow relationship
    await db
      .delete(follower)
      .where(
        and(
          eq(follower.followerId, session.user.id),
          eq(follower.creatorId, creatorId)
        )
      );

    // Get updated follower count
    const followerCount = await db
      .select()
      .from(follower)
      .where(eq(follower.creatorId, creatorId));

    return NextResponse.json({
      success: true,
      following: false,
      followerCount: followerCount.length,
    });
  } catch (error) {
    console.error("Error unfollowing creator:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET - Check if current user follows creator
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ creatorId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const { creatorId } = await params;

    // Get follower count (public)
    const followers = await db
      .select()
      .from(follower)
      .where(eq(follower.creatorId, creatorId));

    const followerCount = followers.length;

    // Check if current user follows (if authenticated)
    let isFollowing = false;
    if (session?.user) {
      const followRecord = await db.query.follower.findFirst({
        where: (f, { eq: eqOp, and: andOp }) =>
          andOp(
            eqOp(f.followerId, session.user.id),
            eqOp(f.creatorId, creatorId)
          ),
      });
      isFollowing = !!followRecord;
    }

    return NextResponse.json({
      following: isFollowing,
      followerCount,
    });
  } catch (error) {
    console.error("Error checking follow status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

