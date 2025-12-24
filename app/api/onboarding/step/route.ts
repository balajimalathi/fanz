import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/client"
import { creator } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import type { OnboardingStepData } from "@/types/onboarding"

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
    const { step, data } = body as { step: number; data: Partial<OnboardingStepData> }

    if (!step || step < 1 || step > 8) {
      return NextResponse.json(
        { error: "Invalid step number" },
        { status: 400 }
      )
    }

    // Get or create creator record
    let creatorRecord = await db.query.creator.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, session.user.id),
    })

    if (!creatorRecord) {
      // Create creator record if it doesn't exist
      const [newCreator] = await db
        .insert(creator)
        .values({
          id: session.user.id,
          displayName: session.user.name || "",
          onboardingStep: step,
          onboardingData: data as Record<string, unknown>,
        })
        .returning()

      creatorRecord = newCreator
    } else {
      // Update existing creator record
      const currentData = (creatorRecord.onboardingData as Record<string, unknown>) || {}
      const updatedData = { ...currentData, ...data }

      await db
        .update(creator)
        .set({
          onboardingStep: step,
          onboardingData: updatedData,
          updatedAt: new Date(),
        })
        .where(eq(creator.id, session.user.id))
    }

    return NextResponse.json({ success: true, step })
  } catch (error) {
    console.error("Error saving onboarding step:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

