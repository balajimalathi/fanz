import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/client"
import { creator } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { validateUsernameFormat, isReservedSubdomain } from "@/lib/onboarding/validation-client"

// GET - Fetch creator profile data
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

    // Fetch creator record
    const creatorRecord = await db.query.creator.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, session.user.id),
    })

    if (!creatorRecord) {
      return NextResponse.json(
        { error: "Creator not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      username: creatorRecord.username || "",
      displayName: creatorRecord.displayName,
      bio: creatorRecord.bio || "",
      usernameLocked: creatorRecord.usernameLocked,
    })
  } catch (error) {
    console.error("Error fetching creator profile:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PATCH - Update creator profile
export async function PATCH(request: NextRequest) {
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

    const body = await request.json()
    const { username, displayName, bio } = body as {
      username?: string
      displayName?: string
      bio?: string
    }

    // Fetch current creator record
    const creatorRecord = await db.query.creator.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, session.user.id),
    })

    if (!creatorRecord) {
      return NextResponse.json(
        { error: "Creator not found" },
        { status: 404 }
      )
    }

    const updateData: {
      username?: string
      displayName?: string
      bio?: string | null
      updatedAt: Date
    } = {
      updatedAt: new Date(),
    }

    // Validate and update displayName
    if (displayName !== undefined) {
      if (!displayName || displayName.trim().length === 0) {
        return NextResponse.json(
          { error: "Display name is required" },
          { status: 400 }
        )
      }
      if (displayName.length > 100) {
        return NextResponse.json(
          { error: "Display name must be less than 100 characters" },
          { status: 400 }
        )
      }
      updateData.displayName = displayName.trim()
    }

    // Validate and update bio
    if (bio !== undefined) {
      if (bio.length > 500) {
        return NextResponse.json(
          { error: "Bio must be less than 500 characters" },
          { status: 400 }
        )
      }
      updateData.bio = bio.trim() || null
    }

    // Validate and update username (only if not locked)
    if (username !== undefined) {
      if (creatorRecord.usernameLocked) {
        return NextResponse.json(
          { error: "Username is locked and cannot be changed" },
          { status: 400 }
        )
      }

      // Format validation
      const formatCheck = validateUsernameFormat(username)
      if (!formatCheck.valid) {
        return NextResponse.json(
          { error: formatCheck.error },
          { status: 400 }
        )
      }

      // Reserved subdomain check
      if (isReservedSubdomain(username)) {
        return NextResponse.json(
          { error: "This username is reserved and cannot be used" },
          { status: 400 }
        )
      }

      // Uniqueness check (case-insensitive)
      const existingCreator = await db.query.creator.findFirst({
        where: (c, { eq: eqOp }) => eqOp(c.username, username.toLowerCase()),
      })

      if (existingCreator && existingCreator.id !== session.user.id) {
        return NextResponse.json(
          { error: "This username is already taken" },
          { status: 400 }
        )
      }

      updateData.username = username.toLowerCase()
    }

    // Update creator record
    await db
      .update(creator)
      .set(updateData)
      .where(eq(creator.id, session.user.id))

    // Fetch updated record
    const updatedCreator = await db.query.creator.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, session.user.id),
    })

    return NextResponse.json({
      username: updatedCreator?.username || "",
      displayName: updatedCreator?.displayName || "",
      bio: updatedCreator?.bio || "",
      usernameLocked: updatedCreator?.usernameLocked || false,
    })
  } catch (error) {
    console.error("Error updating creator profile:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

