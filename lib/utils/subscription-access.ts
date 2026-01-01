import { db } from "@/lib/db/client"
import { postMembership, subscriptions, customers, user, post, postPurchase } from "@/lib/db/schema"
import { eq, and, gt, or, inArray } from "drizzle-orm"

/**
 * Check if a user has access to a post based on their subscription status or purchase
 * @param userId - The user ID to check
 * @param postId - The post ID to check access for
 * @returns true if user has active subscription to any linked membership or has purchased exclusive post, false otherwise
 */
export async function hasAccessToPost(
  userId: string,
  postId: string
): Promise<boolean> {
  try {
    // Get the post to check its type
    const postRecord = await db.query.post.findFirst({
      where: (p, { eq: eqOp }) => eqOp(p.id, postId),
    })

    if (!postRecord) {
      return false
    }

    // For exclusive posts, check if user has purchased it
    if (postRecord.postType === "exclusive") {
      const purchase = await db.query.postPurchase.findFirst({
        where: (pp, { eq: eqOp, and: andOp }) =>
          andOp(eqOp(pp.userId, userId), eqOp(pp.postId, postId)),
      })
      return !!purchase
    }

    // For subscription posts, check membership access
    // Get the user's email
    const userRecord = await db.query.user.findFirst({
      where: (u, { eq: eqOp }) => eqOp(u.id, userId),
    })

    if (!userRecord) {
      return false
    }

    // Get all memberships linked to this post
    const postMemberships = await db.query.postMembership.findMany({
      where: (pm, { eq: eqOp }) => eqOp(pm.postId, postId),
    })

    // If post has no memberships, it's accessible to everyone (or handle differently)
    if (postMemberships.length === 0) {
      return true // Or false, depending on your business logic
    }

    const membershipIds = postMemberships.map((pm) => pm.membershipId)

    // Find customer record by email
    const customerRecord = await db.query.customers.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.email, userRecord.email),
    })

    if (!customerRecord) {
      return false
    }

    // Check for active subscriptions
    // planId in subscriptions should match membership.id (as string)
    const membershipIdStrings = membershipIds.map((id) => id.toString())

    // Get all subscriptions for this customer
    const allSubscriptions = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.customerId, customerRecord.id))

    // Filter for active subscriptions that match any membership
    const activeSubscriptions = allSubscriptions.filter(
      (sub) =>
        membershipIdStrings.includes(sub.planId) &&
        sub.status === "active" &&
        (sub.currentPeriodEnd === null || sub.currentPeriodEnd > new Date())
    )

    return activeSubscriptions.length > 0
  } catch (error) {
    console.error("Error checking subscription access:", error)
    return false
  }
}

/**
 * Get subscription status for a user and post
 * @param userId - The user ID
 * @param postId - The post ID
 * @returns Object with hasAccess boolean and subscription details
 */
export async function getSubscriptionStatus(
  userId: string,
  postId: string
): Promise<{
  hasAccess: boolean
  subscriptions: Array<{
    planId: string
    status: string
    currentPeriodEnd: Date | null
  }>
}> {
  try {
    const userRecord = await db.query.user.findFirst({
      where: (u, { eq: eqOp }) => eqOp(u.id, userId),
    })

    if (!userRecord) {
      return { hasAccess: false, subscriptions: [] }
    }

    const postMemberships = await db.query.postMembership.findMany({
      where: (pm, { eq: eqOp }) => eqOp(pm.postId, postId),
    })

    if (postMemberships.length === 0) {
      return { hasAccess: true, subscriptions: [] }
    }

    const membershipIds = postMemberships.map((pm) => pm.membershipId)
    const membershipIdStrings = membershipIds.map((id) => id.toString())

    const customerRecord = await db.query.customers.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.email, userRecord.email),
    })

    if (!customerRecord) {
      return { hasAccess: false, subscriptions: [] }
    }

    // Get all subscriptions for this customer and filter client-side
    const allSubscriptions = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.customerId, customerRecord.id))

    const userSubscriptions = allSubscriptions.filter((sub) =>
      membershipIdStrings.includes(sub.planId)
    )

    const activeSubscriptions = userSubscriptions.filter(
      (sub) =>
        sub.status === "active" &&
        (sub.currentPeriodEnd === null ||
          sub.currentPeriodEnd > new Date())
    )

    return {
      hasAccess: activeSubscriptions.length > 0,
      subscriptions: userSubscriptions.map((sub) => ({
        planId: sub.planId,
        status: sub.status,
        currentPeriodEnd: sub.currentPeriodEnd,
      })),
    }
  } catch (error) {
    console.error("Error getting subscription status:", error)
    return { hasAccess: false, subscriptions: [] }
  }
}

