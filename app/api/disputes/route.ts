import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/client"
import { dispute } from "@/lib/db/schema"
import { z } from "zod"

const createDisputeSchema = z.object({
  transactionId: z.string().uuid().optional(),
  payoutId: z.string().uuid().optional(),
  creatorId: z.string().optional(),
  disputeType: z.enum(["transaction", "payout", "refund", "service", "other"]),
  reason: z.string().min(1),
  description: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validationResult = createDisputeSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    const { transactionId, payoutId, creatorId, disputeType, reason, description } =
      validationResult.data

    // At least one related entity must be provided
    if (!transactionId && !payoutId) {
      return NextResponse.json(
        { error: "transactionId or payoutId must be provided" },
        { status: 400 }
      )
    }

    const newDispute = await db
      .insert(dispute)
      .values({
        userId: session.user.id,
        transactionId: transactionId || null,
        payoutId: payoutId || null,
        creatorId: creatorId || null,
        disputeType,
        reason,
        description: description || null,
        status: "open",
      })
      .returning()

    return NextResponse.json({
      success: true,
      dispute: newDispute[0],
    })
  } catch (error) {
    console.error("Error creating dispute:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

