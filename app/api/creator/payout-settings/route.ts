import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/client"
import { creator } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const creatorRecord = await db.query.creator.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, session.user.id),
    })

    if (!creatorRecord) {
      return NextResponse.json({ error: "Creator not found" }, { status: 404 })
    }

    const payoutSettings = creatorRecord.payoutSettings || {
      minimumThreshold: 1000, // Default 1000 rupees
      automaticPayout: false,
    }

    return NextResponse.json({ payoutSettings })
  } catch (error) {
    console.error("Error fetching payout settings:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { minimumThreshold, automaticPayout } = body

    if (minimumThreshold !== undefined && (typeof minimumThreshold !== "number" || minimumThreshold < 0)) {
      return NextResponse.json(
        { error: "Invalid minimum threshold" },
        { status: 400 }
      )
    }

    if (automaticPayout !== undefined && typeof automaticPayout !== "boolean") {
      return NextResponse.json(
        { error: "Invalid automatic payout value" },
        { status: 400 }
      )
    }

    const creatorRecord = await db.query.creator.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, session.user.id),
    })

    if (!creatorRecord) {
      return NextResponse.json({ error: "Creator not found" }, { status: 404 })
    }

    const existingSettings = creatorRecord.payoutSettings || {}
    const updatedSettings = {
      ...existingSettings,
      ...(minimumThreshold !== undefined && { minimumThreshold }),
      ...(automaticPayout !== undefined && { automaticPayout }),
    }

    await db
      .update(creator)
      .set({
        payoutSettings: updatedSettings,
        updatedAt: new Date(),
      })
      .where(eq(creator.id, session.user.id))

    return NextResponse.json({ success: true, payoutSettings: updatedSettings })
  } catch (error) {
    console.error("Error updating payout settings:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

