import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/client"
import { subscriptions, customers, user } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

// POST - Cancel a subscription
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ subscriptionId: string }> }
) {
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

    const { subscriptionId } = await params

    // Get user record to find email
    const userRecord = await db.query.user.findFirst({
      where: (u, { eq: eqOp }) => eqOp(u.id, session.user.id),
    })

    if (!userRecord) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Find customer record by email
    const customerRecord = await db.query.customers.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.email, userRecord.email),
    })

    if (!customerRecord) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      )
    }

    // Fetch the subscription and verify ownership
    const subscriptionRecord = await db.query.subscriptions.findFirst({
      where: (s, { eq: eqOp }) => eqOp(s.id, subscriptionId),
    })

    if (!subscriptionRecord) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      )
    }

    // Verify the subscription belongs to the authenticated user
    if (subscriptionRecord.customerId !== customerRecord.id) {
      return NextResponse.json(
        { error: "Forbidden: Subscription does not belong to you" },
        { status: 403 }
      )
    }

    // Check if subscription is already cancelled
    if (subscriptionRecord.status === "cancelled" || subscriptionRecord.status === "canceled") {
      return NextResponse.json(
        { error: "Subscription is already cancelled" },
        { status: 400 }
      )
    }

    // Update subscription status to cancelled
    // Keep currentPeriodEnd unchanged so access continues until period ends
    await db
      .update(subscriptions)
      .set({
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, subscriptionId))

    return NextResponse.json({
      message: "Subscription cancelled successfully",
      subscription: {
        id: subscriptionRecord.id,
        status: "cancelled",
        currentPeriodEnd: subscriptionRecord.currentPeriodEnd,
      },
    })
  } catch (error) {
    console.error("Error cancelling subscription:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
