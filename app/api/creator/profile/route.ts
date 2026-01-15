import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/client"
import { creator } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { validateUsernameFormat, isReservedSubdomain } from "@/lib/onboarding/validation-client"
import { updateCreatorProfileSchema } from "@/lib/validations/creator"

// GET - Fetch creator profile data
/**
 * @summary Fetch creator profile
 * @description Retrieves the profile information for the authenticated creator.
 * @tags Creator
 * @security BearerAuth
 * @returns {object} 200 - Creator profile data
 * @returns {object} 401 - Unauthorized
 * @returns {object} 403 - Forbidden
 * @returns {object} 404 - Creator not found
 * @returns {object} 500 - Internal server error
 */
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
/**
 * @summary Update creator profile
 * @description Updates the profile information for the authenticated creator.
 * @tags Creator
 * @security BearerAuth
 * @param {object} request.body.required - The profile update data
 * @property {string} [username] - The new username (must be unique and valid format)
 * @property {string} [displayName] - The new display name
 * @property {string} [bio] - The new bio
 * @returns {object} 200 - Updated creator profile data
 * @returns {object} 400 - Validation failed or username unavailable
 * @returns {object} 401 - Unauthorized
 * @returns {object} 403 - Forbidden
 * @returns {object} 404 - Creator not found
 * @returns {object} 500 - Internal server error
 */
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

    // Validate input with Zod
    const validationResult = updateCreatorProfileSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    const { username, displayName, bio } = validationResult.data

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

    if (displayName) {
      updateData.displayName = displayName
    }

    if (bio !== undefined) {
      updateData.bio = bio || null
    }

    // Validate and update username (only if provided and not locked)
    if (username) {
      // If username hasn't changed, ignore
      if (username.toLowerCase() !== creatorRecord.username?.toLowerCase()) {
        if (creatorRecord.usernameLocked) {
          return NextResponse.json(
            { error: "Username is locked and cannot be changed" },
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

