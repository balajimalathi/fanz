import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { checkMembershipSubscription } from "@/lib/utils/membership-subscription"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: membershipId } = await params

    if (!membershipId) {
      return NextResponse.json(
        { error: "Membership ID is required" },
        { status: 400 }
      )
    }

    const subscriptionStatus = await checkMembershipSubscription(
      session.user.id,
      membershipId
    )

    return NextResponse.json(subscriptionStatus)
  } catch (error) {
    console.error("Error checking membership subscription status:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

