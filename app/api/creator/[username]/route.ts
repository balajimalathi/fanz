import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params

    if (!username) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      )
    }

    // Fetch creator by username (case-insensitive - usernames are stored in lowercase)
    const creatorRecord = await db.query.creator.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.username, username.toLowerCase()),
    })

    if (!creatorRecord) {
      return NextResponse.json(
        { error: "Creator not found" },
        { status: 404 }
      )
    }

    // Only return profile if creator is onboarded
    if (!creatorRecord.onboarded) {
      return NextResponse.json(
        { error: "Creator profile not available" },
        { status: 404 }
      )
    }

    // Fetch visible services for this creator
    const services = await db.query.service.findMany({
      where: (s, { eq: eqOp, and: andOp }) =>
        andOp(eqOp(s.creatorId, creatorRecord.id), eqOp(s.visible, true)),
      orderBy: (s, { desc }) => [desc(s.createdAt)],
    })

    // Fetch visible memberships for this creator
    const memberships = await db.query.membership.findMany({
      where: (m, { eq: eqOp, and: andOp }) =>
        andOp(eqOp(m.creatorId, creatorRecord.id), eqOp(m.visible, true)),
      orderBy: (m, { desc }) => [desc(m.createdAt)],
    })

    // Convert prices from paise to rupees for display
    const servicesWithRupees = services.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      price: s.price / 100, // Convert paise to rupees
    }))

    const membershipsWithRupees = memberships.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      monthlyRecurringFee: m.monthlyRecurringFee / 100, // Convert paise to rupees
      coverImageUrl: m.coverImageUrl,
    }))

    return NextResponse.json({
      creator: {
        id: creatorRecord.id,
        username: creatorRecord.username,
        displayName: creatorRecord.displayName,
        bio: creatorRecord.bio,
        profileImageUrl: creatorRecord.profileImageUrl,
        profileCoverUrl: creatorRecord.profileCoverUrl,
        country: creatorRecord.country,
        creatorType: creatorRecord.creatorType,
        contentType: creatorRecord.contentType,
        categories: creatorRecord.categories,
      },
      services: servicesWithRupees,
      memberships: membershipsWithRupees,
    })
  } catch (error) {
    console.error("Error fetching creator profile:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

