import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/client"
import { creator } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { validateUsernameFormat, isReservedSubdomain } from "@/lib/onboarding/validation-client"

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

    const body = await request.json()
    const { username } = body as { username: string }

    if (!username) {
      return NextResponse.json(
        { valid: false, error: "Username is required" },
        { status: 400 }
      )
    }

    // Format validation
    const formatCheck = validateUsernameFormat(username)
    if (!formatCheck.valid) {
      return NextResponse.json(formatCheck)
    }

    // Reserved subdomain check
    if (isReservedSubdomain(username)) {
      return NextResponse.json({
        valid: false,
        error: "This username is reserved and cannot be used",
      })
    }

    // Uniqueness check
    const existingCreator = await db.query.creator.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.username, username.toLowerCase()),
    })

    if (existingCreator && existingCreator.id !== session.user.id) {
      return NextResponse.json({
        valid: false,
        error: "This username is already taken",
      })
    }

    return NextResponse.json({ valid: true })
  } catch (error) {
    console.error("Error validating username:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

