import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/client"
import { creator } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import type { AvailabilitySchedule } from "@/lib/services/timezone-service"

// GET - Fetch creator feature settings
/**
 * @summary Fetch creator feature settings
 * @description Retrieves the chat and call enabled status for the authenticated creator.
 * @tags Creator
 * @security BearerAuth
 * @returns {object} 200 - Creator feature settings
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
      chatEnabled: creatorRecord.chatEnabled ?? true,
      callEnabled: creatorRecord.callEnabled ?? true,
      chatAvailabilitySchedule: creatorRecord.chatAvailabilitySchedule ?? null,
      callAvailabilitySchedule: creatorRecord.callAvailabilitySchedule ?? null,
    })
  } catch (error) {
    console.error("Error fetching creator feature settings:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PATCH - Update creator feature settings
/**
 * @summary Update creator feature settings
 * @description Updates the chat and call enabled status for the authenticated creator.
 * @tags Creator
 * @security BearerAuth
 * @param {object} request.body.required - The feature settings update data
 * @property {boolean} [chatEnabled] - Whether chat is enabled
 * @property {boolean} [callEnabled] - Whether calls are enabled
 * @returns {object} 200 - Updated creator feature settings
 * @returns {object} 400 - Validation failed
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
    const {
      chatEnabled,
      callEnabled,
      chatAvailabilitySchedule,
      callAvailabilitySchedule,
    } = body

    // Validate input
    if (chatEnabled !== undefined && typeof chatEnabled !== "boolean") {
      return NextResponse.json(
        { error: "chatEnabled must be a boolean" },
        { status: 400 }
      )
    }

    if (callEnabled !== undefined && typeof callEnabled !== "boolean") {
      return NextResponse.json(
        { error: "callEnabled must be a boolean" },
        { status: 400 }
      )
    }

    // Validate availability schedules (allow null to disable scheduling)
    if (chatAvailabilitySchedule !== undefined && chatAvailabilitySchedule !== null) {
      console.log("[Feature Settings] Validating chat schedule:", JSON.stringify(chatAvailabilitySchedule, null, 2))
      if (!validateAvailabilitySchedule(chatAvailabilitySchedule)) {
        console.error("[Feature Settings] Chat schedule validation failed")
        return NextResponse.json(
          {
            error:
              "chatAvailabilitySchedule must be a valid schedule object with enabled, timezone, and schedule fields",
          },
          { status: 400 }
        )
      }
    }

    if (callAvailabilitySchedule !== undefined && callAvailabilitySchedule !== null) {
      console.log("[Feature Settings] Validating call schedule:", JSON.stringify(callAvailabilitySchedule, null, 2))
      if (!validateAvailabilitySchedule(callAvailabilitySchedule)) {
        console.error("[Feature Settings] Call schedule validation failed")
        return NextResponse.json(
          {
            error:
              "callAvailabilitySchedule must be a valid schedule object with enabled, timezone, and schedule fields",
          },
          { status: 400 }
        )
      }
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
      chatEnabled?: boolean
      callEnabled?: boolean
      chatAvailabilitySchedule?: AvailabilitySchedule | null
      callAvailabilitySchedule?: AvailabilitySchedule | null
      updatedAt: Date
    } = {
      updatedAt: new Date(),
    }

    if (chatEnabled !== undefined) {
      updateData.chatEnabled = chatEnabled
    }

    if (callEnabled !== undefined) {
      updateData.callEnabled = callEnabled
    }

    if (chatAvailabilitySchedule !== undefined) {
      updateData.chatAvailabilitySchedule =
        chatAvailabilitySchedule || null
    }

    if (callAvailabilitySchedule !== undefined) {
      updateData.callAvailabilitySchedule =
        callAvailabilitySchedule || null
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
      chatEnabled: updatedCreator?.chatEnabled ?? true,
      callEnabled: updatedCreator?.callEnabled ?? true,
      chatAvailabilitySchedule: updatedCreator?.chatAvailabilitySchedule ?? null,
      callAvailabilitySchedule: updatedCreator?.callAvailabilitySchedule ?? null,
    })
  } catch (error) {
    console.error("Error updating creator feature settings:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * Validate availability schedule structure
 */
function validateAvailabilitySchedule(
  schedule: unknown
): schedule is AvailabilitySchedule {
  // Allow null (scheduling disabled)
  if (schedule === null || schedule === undefined) {
    return false // This is handled separately in the route handler
  }

  if (typeof schedule !== "object") {
    console.error("[Validation] Schedule is not an object:", typeof schedule)
    return false
  }

  const s = schedule as Record<string, unknown>

  // Check required fields
  if (typeof s.enabled !== "boolean") {
    console.error("[Validation] enabled is not boolean:", typeof s.enabled)
    return false
  }

  if (typeof s.timezone !== "string" || s.timezone.length === 0) {
    console.error("[Validation] timezone is invalid:", s.timezone)
    return false
  }

  if (!s.schedule || typeof s.schedule !== "object") {
    console.error("[Validation] schedule field is invalid:", typeof s.schedule)
    return false
  }

  // Validate schedule days
  const days = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ]

  const scheduleObj = s.schedule as Record<string, unknown>

  // Check that schedule is not an array
  if (Array.isArray(scheduleObj)) {
    console.error("[Validation] schedule should be an object, not an array")
    return false
  }

  for (const [day, daySchedule] of Object.entries(scheduleObj)) {
    const dayLower = day.toLowerCase()
    if (!days.includes(dayLower)) {
      console.error("[Validation] Invalid day:", day)
      return false
    }

    if (!daySchedule || typeof daySchedule !== "object") {
      console.error("[Validation] Day schedule is not an object for day:", day)
      return false
    }

    const ds = daySchedule as Record<string, unknown>

    if (typeof ds.enabled !== "boolean") {
      console.error("[Validation] Day enabled is not boolean for day:", day)
      return false
    }

    // Validate time format (HH:mm) - required for all days
    if (typeof ds.startTime !== "string" || !/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(ds.startTime)) {
      console.error("[Validation] Invalid or missing startTime for day:", day, ds.startTime)
      return false
    }

    if (typeof ds.endTime !== "string" || !/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(ds.endTime)) {
      console.error("[Validation] Invalid or missing endTime for day:", day, ds.endTime)
      return false
    }
  }

  return true
}
