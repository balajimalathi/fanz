import { db } from "@/lib/db/client"
import { subscriptions, customers, user } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

/**
 * Check if a user has an active subscription to a specific membership
 * @param userId - The user ID
 * @param membershipId - The membership ID
 * @returns Object with isSubscribed boolean and subscription details
 */
export async function checkMembershipSubscription(
  userId: string,
  membershipId: string
): Promise<{
  isSubscribed: boolean
  subscription?: {
    id: string
    status: string
    currentPeriodEnd: Date | null
    currentPeriodStart: Date | null
  }
}> {
  try {
    const userRecord = await db.query.user.findFirst({
      where: (u, { eq: eqOp }) => eqOp(u.id, userId),
    })

    if (!userRecord) {
      return { isSubscribed: false }
    }

    // Find customer record by email
    const customerRecord = await db.query.customers.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.email, userRecord.email),
    })

    if (!customerRecord) {
      return { isSubscribed: false }
    }

    // Check for active subscription to this membership
    // planId in subscriptions should match membership.id (as string)
    const membershipIdString = membershipId.toString()

    const subscription = await db.query.subscriptions.findFirst({
      where: (s, { eq: eqOp, and: andOp }) =>
        andOp(
          eqOp(s.customerId, customerRecord.id),
          eqOp(s.planId, membershipIdString)
        ),
    })

    if (!subscription) {
      return { isSubscribed: false }
    }

    // Check if subscription is active and not expired
    const isActive =
      subscription.status === "active" &&
      (subscription.currentPeriodEnd === null ||
        subscription.currentPeriodEnd > new Date())

    return {
      isSubscribed: isActive,
      subscription: isActive
        ? {
            id: subscription.id,
            status: subscription.status,
            currentPeriodEnd: subscription.currentPeriodEnd,
            currentPeriodStart: subscription.currentPeriodStart,
          }
        : undefined,
    }
  } catch (error) {
    console.error("Error checking membership subscription:", error)
    return { isSubscribed: false }
  }
}

