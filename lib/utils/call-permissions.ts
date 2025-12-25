import { db } from "@/lib/db/client"
import { subscriptions, customers, user, membership, callPermission, creator } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

/**
 * Check if a fan can call a creator based on their subscription status
 * @param fanId - The fan's user ID
 * @param creatorId - The creator's user ID
 * @returns true if fan has active subscription to creator, false otherwise
 */
export async function canFanCallCreator(
  fanId: string,
  creatorId: string
): Promise<boolean> {
  try {
    // Get the fan's email
    const fanRecord = await db.query.user.findFirst({
      where: (u, { eq: eqOp }) => eqOp(u.id, fanId),
    })

    if (!fanRecord) {
      return false
    }

    // Get all memberships for this creator
    const creatorMemberships = await db.query.membership.findMany({
      where: (m, { eq: eqOp }) => eqOp(m.creatorId, creatorId),
    })

    if (creatorMemberships.length === 0) {
      // If creator has no memberships, allow calls (or restrict - adjust based on business logic)
      return false // Default to restricted if no memberships
    }

    const membershipIds = creatorMemberships.map((m) => m.id.toString())

    // Find customer record by email
    const customerRecord = await db.query.customers.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.email, fanRecord.email),
    })

    if (!customerRecord) {
      return false
    }

    // Check for active subscriptions
    const allSubscriptions = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.customerId, customerRecord.id))

    // Filter for active subscriptions that match any membership
    const activeSubscriptions = allSubscriptions.filter(
      (sub) =>
        membershipIds.includes(sub.planId) &&
        sub.status === "active" &&
        (sub.currentPeriodEnd === null || sub.currentPeriodEnd > new Date())
    )

    return activeSubscriptions.length > 0
  } catch (error) {
    console.error("Error checking call permission:", error)
    return false
  }
}

/**
 * Get or update call permission for a fan-creator pair
 * @param fanId - The fan's user ID
 * @param creatorId - The creator's user ID
 * @param forceCheck - Force recheck subscription status
 * @returns Permission object with canCall boolean
 */
export async function getCallPermission(
  fanId: string,
  creatorId: string,
  forceCheck: boolean = false
): Promise<{ canCall: boolean; cached: boolean }> {
  try {
    // Check for cached permission if not forcing check
    if (!forceCheck) {
      const cached = await db.query.callPermission.findFirst({
        where: (cp, { eq: eqOp, and: andOp }) =>
          andOp(
            eqOp(cp.fanId, fanId),
            eqOp(cp.creatorId, creatorId)
          ),
      })

      if (cached) {
        // Check if cache is still fresh (within last hour)
        const cacheAge = Date.now() - cached.lastCheckedAt.getTime()
        const oneHour = 60 * 60 * 1000
        if (cacheAge < oneHour) {
          return { canCall: cached.canCall, cached: true }
        }
      }
    }

    // Check actual subscription status
    const canCall = await canFanCallCreator(fanId, creatorId)

    // Update or create permission record
    const existing = await db.query.callPermission.findFirst({
      where: (cp, { eq: eqOp, and: andOp }) =>
        andOp(
          eqOp(cp.fanId, fanId),
          eqOp(cp.creatorId, creatorId)
        ),
    })

    if (existing) {
      await db
        .update(callPermission)
        .set({
          canCall,
          lastCheckedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(callPermission.id, existing.id))
    } else {
      await db.insert(callPermission).values({
        fanId,
        creatorId,
        canCall,
        lastCheckedAt: new Date(),
      })
    }

    return { canCall, cached: false }
  } catch (error) {
    console.error("Error getting call permission:", error)
    return { canCall: false, cached: false }
  }
}

/**
 * Invalidate call permission cache for a fan-creator pair
 * This should be called when subscription status changes
 */
export async function invalidateCallPermission(
  fanId: string,
  creatorId: string
): Promise<void> {
  try {
    await db
      .update(callPermission)
      .set({
        lastCheckedAt: new Date(0), // Set to epoch to force recheck
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(callPermission.fanId, fanId),
          eq(callPermission.creatorId, creatorId)
        )
      )
  } catch (error) {
    console.error("Error invalidating call permission:", error)
  }
}

