import { db } from "@/lib/db/client"
import { serviceOrder } from "@/lib/db/schema"
import { eq, and, lt, isNull } from "drizzle-orm"

/**
 * Order Deadline Service
 * Handles fulfillment deadline management for service orders
 */
export class OrderDeadlineService {
  /**
   * Check if an order is within the fulfillment deadline
   */
  static isWithinDeadline(
    activatedAt: Date | null,
    deadlineHours: number | null
  ): { isWithin: boolean; deadlineDate: Date | null; isPassed: boolean } {
    if (!activatedAt) {
      return { isWithin: false, deadlineDate: null, isPassed: false }
    }

    const defaultDeadlineHours = parseInt(process.env.FULFILLMENT_DEADLINE_HOURS || "12", 10)
    const hours = deadlineHours || defaultDeadlineHours
    const deadlineDate = new Date(activatedAt.getTime() + hours * 60 * 60 * 1000)
    const now = new Date()
    const isPassed = now > deadlineDate

    return {
      isWithin: !isPassed,
      deadlineDate,
      isPassed,
    }
  }

  /**
   * Auto-cancel orders that have passed the fulfillment deadline
   * This should be called by a cron job or background task
   */
  static async autoCancelExpiredOrders(): Promise<{
    cancelled: number
    errors: string[]
  }> {
    const errors: string[] = []
    let cancelled = 0

    try {
      const defaultDeadlineHours = parseInt(process.env.FULFILLMENT_DEADLINE_HOURS || "12", 10)
      const now = new Date()
      const deadlineThreshold = new Date(now.getTime() - defaultDeadlineHours * 60 * 60 * 1000)

      // Find orders that:
      // 1. Are in "fulfilled" status (creator marked as fulfilled)
      // 2. Have been activated
      // 3. Don't have customerFulfilledAt set (fan hasn't confirmed)
      // 4. Activated more than deadlineHours ago
      const expiredOrders = await db
        .select()
        .from(serviceOrder)
        .where(
          and(
            eq(serviceOrder.status, "fulfilled"),
            isNull(serviceOrder.customerFulfilledAt),
            // @ts-ignore - drizzle type issue
            lt(serviceOrder.activatedAt, deadlineThreshold)
          )
        )

      // Also check orders with custom deadline hours
      const allFulfilledOrders = await db
        .select()
        .from(serviceOrder)
        .where(
          and(
            eq(serviceOrder.status, "fulfilled"),
            isNull(serviceOrder.customerFulfilledAt)
          )
        )

      for (const order of allFulfilledOrders) {
        if (!order.activatedAt) continue

        const deadlineHours = order.fulfillmentDeadlineHours || defaultDeadlineHours
        const deadlineDate = new Date(order.activatedAt.getTime() + deadlineHours * 60 * 60 * 1000)

        if (now > deadlineDate) {
          try {
            await db
              .update(serviceOrder)
              .set({
                status: "cancelled",
                updatedAt: new Date(),
              })
              .where(eq(serviceOrder.id, order.id))

            cancelled++
          } catch (error) {
            errors.push(`Failed to cancel order ${order.id}: ${error instanceof Error ? error.message : "Unknown error"}`)
          }
        }
      }

      return { cancelled, errors }
    } catch (error) {
      errors.push(`Error in autoCancelExpiredOrders: ${error instanceof Error ? error.message : "Unknown error"}`)
      return { cancelled, errors }
    }
  }

  /**
   * Get orders that are approaching their deadline (within 1 hour)
   */
  static async getOrdersApproachingDeadline(creatorId?: string): Promise<typeof serviceOrder.$inferSelect[]> {
    try {
      const defaultDeadlineHours = parseInt(process.env.FULFILLMENT_DEADLINE_HOURS || "12", 10)
      const now = new Date()
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000)

      const conditions = [
        eq(serviceOrder.status, "fulfilled"),
        isNull(serviceOrder.customerFulfilledAt),
      ]

      if (creatorId) {
        conditions.push(eq(serviceOrder.creatorId, creatorId))
      }

      const allFulfilledOrders = await db
        .select()
        .from(serviceOrder)
        .where(and(...conditions))

      // Filter orders that are approaching deadline
      return allFulfilledOrders.filter((order) => {
        if (!order.activatedAt) return false

        const deadlineHours = order.fulfillmentDeadlineHours || defaultDeadlineHours
        const deadlineDate = new Date(order.activatedAt.getTime() + deadlineHours * 60 * 60 * 1000)

        // Within 1 hour of deadline and not yet passed
        return deadlineDate <= oneHourFromNow && deadlineDate > now
      })
    } catch (error) {
      console.error("Error getting orders approaching deadline:", error)
      return []
    }
  }
}
