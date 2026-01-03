import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/client"
import { creator } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { validateUsername, generateUniqueSubdomain } from "@/lib/onboarding/validation"
import type { OnboardingFormData } from "@/types/onboarding"

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
    const formData = body as OnboardingFormData

    // Validate all required fields
    if (
      !formData.country ||
      !formData.creatorType ||
      !formData.contentType ||
      !formData.username ||
      !formData.displayName ||
      !formData.gender ||
      !formData.dateOfBirth ||
      !formData.categories ||
      formData.categories.length === 0
    ) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      )
    }

    // Validate username
    const usernameValidation = await validateUsername(formData.username, session.user.id)
    if (!usernameValidation.valid) {
      return NextResponse.json(
        { error: usernameValidation.error || "Invalid username" },
        { status: 400 }
      )
    }

    // Get creator record
    const creatorRecord = await db.query.creator.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, session.user.id),
    })

    if (!creatorRecord) {
      return NextResponse.json(
        { error: "Creator record not found" },
        { status: 404 }
      )
    }

    // Check if already onboarded
    if (creatorRecord.onboarded) {
      return NextResponse.json(
        { error: "Already onboarded" },
        { status: 400 }
      )
    }

    // Generate unique subdomain
    const subdomain = await generateUniqueSubdomain(formData.username, session.user.id)

    // Parse date of birth
    const dateOfBirth = new Date(formData.dateOfBirth + "T00:00:00")

    // Update creator record with all data
    await db
      .update(creator)
      .set({
        username: formData.username.toLowerCase(),
        displayName: formData.displayName,
        country: formData.country,
        currency: (formData as any).currency || "USD",
        creatorType: formData.creatorType,
        contentType: formData.contentType,
        gender: formData.gender,
        dateOfBirth: dateOfBirth,
        categories: formData.categories,
        onboarded: true,
        usernameLocked: true,
        subdomain: subdomain,
        onboardingStep: 9,
        onboardingData: formData as unknown as Record<string, unknown>,
        updatedAt: new Date(),
      })
      .where(eq(creator.id, session.user.id))

    // Trigger email verification (Better-auth handles this)
    // The email verification will be sent automatically by Better-auth
    // when the user tries to access protected routes

    return NextResponse.json({
      success: true,
      message: "Onboarding completed successfully",
      subdomain,
      redirect: "/home",
    })
  } catch (error) {
    console.error("Error completing onboarding:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

