import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/client"
import { report } from "@/lib/db/schema"
import { z } from "zod"

const createReportSchema = z.object({
  reportedUserId: z.string().optional(),
  reportedCreatorId: z.string().optional(),
  reportedPostId: z.string().uuid().optional(),
  reportType: z.enum(["user", "creator", "post", "comment", "message", "other"]),
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
    const validationResult = createReportSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    const { reportedUserId, reportedCreatorId, reportedPostId, reportType, reason, description } =
      validationResult.data

    // At least one reported entity must be provided
    if (!reportedUserId && !reportedCreatorId && !reportedPostId) {
      return NextResponse.json(
        { error: "At least one reported entity must be provided" },
        { status: 400 }
      )
    }

    const newReport = await db
      .insert(report)
      .values({
        reporterId: session.user.id,
        reportedUserId: reportedUserId || null,
        reportedCreatorId: reportedCreatorId || null,
        reportedPostId: reportedPostId || null,
        reportType,
        reason,
        description: description || null,
        status: "pending",
      })
      .returning()

    return NextResponse.json({
      success: true,
      report: newReport[0],
    })
  } catch (error) {
    console.error("Error creating report:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

