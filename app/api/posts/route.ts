import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/client"
import { post, postMembership, membership } from "@/lib/db/schema"
import { eq, inArray } from "drizzle-orm"
import { createPostSchema } from "@/lib/validations/post"

// POST - Create a new post
/**
 * @summary Create a new post
 * @description Creates a new post for the authenticated creator.
 * @tags Posts
 * @security BearerAuth
 * @param {object} request.body.required - The post creation data
 * @property {string} [caption] - The caption of the post
 * @property {string} postType - The type of post (subscription/exclusive)
 * @property {number} [price] - The price for exclusive posts
 * @property {string[]} [membershipIds] - IDs of memberships for subscription posts
 * @returns {object} 201 - The created post
 * @returns {object} 400 - Validation failed or invalid logic
 * @returns {object} 401 - Unauthorized
 * @returns {object} 403 - Forbidden
 * @returns {object} 500 - Internal server error
 */
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

    const body = await request.json()

    // Validate input with Zod
    const validationResult = createPostSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    const { caption, postType, price, membershipIds } = validationResult.data

    // For subscription posts, validate that memberships belong to the creator
    if (postType === "subscription" && membershipIds && membershipIds.length > 0) {
      const creatorMemberships = await db.query.membership.findMany({
        where: (m, { eq: eqOp }) => eqOp(m.creatorId, session.user.id),
      })

      const validMembershipIds = creatorMemberships.map((m) => m.id)
      const invalidIds = membershipIds.filter((id) => !validMembershipIds.includes(id))

      if (invalidIds.length > 0) {
        return NextResponse.json(
          { error: "One or more memberships do not belong to you" },
          { status: 400 }
        )
      }
    }

    // Convert price from rupees to paise for exclusive posts
    const priceInPaise = postType === "exclusive" && price ? Math.round(price * 100) : null

    // Create the post
    const [newPost] = await db
      .insert(post)
      .values({
        creatorId: session.user.id,
        caption: caption || null,
        postType,
        price: priceInPaise,
        isPinned: false,
      })
      .returning()

    // Link memberships for subscription posts
    if (postType === "subscription" && membershipIds && membershipIds.length > 0) {
      await db.insert(postMembership).values(
        membershipIds.map((membershipId) => ({
          postId: newPost.id,
          membershipId,
        }))
      )
    }

    // Fetch linked memberships for subscription posts
    let linkedMemberships: Array<{ id: string; title: string }> = []
    if (postType === "subscription" && membershipIds && membershipIds.length > 0) {
      const memberships = await db
        .select()
        .from(membership)
        .where(inArray(membership.id, membershipIds))
      linkedMemberships = memberships.map((m) => ({ id: m.id, title: m.title }))
    }

    // Convert price back to rupees for response
    const postWithRupees = {
      ...newPost,
      price: newPost.price ? newPost.price / 100 : null,
      memberships: linkedMemberships,
    }

    return NextResponse.json(postWithRupees, { status: 201 })
  } catch (error) {
    console.error("Error creating post:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

