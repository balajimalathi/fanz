import { db } from "@/lib/db/client";
import { serviceOrder, service } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export type ServiceType = "shoutout" | "audio_call" | "video_call" | "chat";

/**
 * Check if a user has an active service order for a specific creator and service type
 * @param userId - The user's ID (customer)
 * @param creatorId - The creator's ID
 * @param serviceType - The type of service (audio_call, video_call, chat)
 * @returns The active service order if found, null otherwise
 */
export async function checkServiceOrderAccess(
  userId: string,
  creatorId: string,
  serviceType: ServiceType
): Promise<typeof serviceOrder.$inferSelect | null> {
  try {
    // Find active service orders for this user-creator pair
    const orders = await db.query.serviceOrder.findMany({
      where: (so, { eq: eqOp, and: andOp }) =>
        andOp(
          eqOp(so.userId, userId),
          eqOp(so.creatorId, creatorId),
          eqOp(so.status, "active")
        ),
    });

    if (orders.length === 0) {
      return null;
    }

    // Find the service for each order and check if it matches the service type
    for (const order of orders) {
      const serviceRecord = await db.query.service.findFirst({
        where: (s, { eq: eqOp }) => eqOp(s.id, order.serviceId),
      });

      if (serviceRecord && serviceRecord.serviceType === serviceType) {
        return order;
      }
    }

    return null;
  } catch (error) {
    console.error("Error checking service order access:", error);
    return null;
  }
}

/**
 * Track when a user (customer or creator) joins a service
 * @param serviceOrderId - The service order ID
 * @param userId - The user's ID who joined
 * @param isCreator - Whether the user is the creator
 */
export async function trackServiceOrderParticipation(
  serviceOrderId: string,
  userId: string,
  isCreator: boolean
): Promise<void> {
  try {
    const order = await db.query.serviceOrder.findFirst({
      where: (so, { eq: eqOp }) => eqOp(so.id, serviceOrderId),
    });

    if (!order) {
      throw new Error("Service order not found");
    }

    // Verify user matches the order
    if (isCreator && order.creatorId !== userId) {
      throw new Error("User is not the creator for this order");
    }
    if (!isCreator && order.userId !== userId) {
      throw new Error("User is not the customer for this order");
    }

    // Update the appropriate timestamp
    const updateData: {
      customerJoinedAt?: Date;
      creatorJoinedAt?: Date;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (isCreator && !order.creatorJoinedAt) {
      updateData.creatorJoinedAt = new Date();
    } else if (!isCreator && !order.customerJoinedAt) {
      updateData.customerJoinedAt = new Date();
    }

    await db
      .update(serviceOrder)
      .set(updateData)
      .where(eq(serviceOrder.id, serviceOrderId));

    // Check if both parties have joined and mark as utilized
    const updatedOrder = await db.query.serviceOrder.findFirst({
      where: (so, { eq: eqOp }) => eqOp(so.id, serviceOrderId),
    });

    if (
      updatedOrder &&
      updatedOrder.customerJoinedAt &&
      updatedOrder.creatorJoinedAt &&
      !updatedOrder.utilizedAt
    ) {
      await markServiceOrderUtilized(serviceOrderId);
    }
  } catch (error) {
    console.error("Error tracking service order participation:", error);
    throw error;
  }
}

/**
 * Mark a service order as utilized (both parties have joined)
 * @param serviceOrderId - The service order ID
 */
export async function markServiceOrderUtilized(
  serviceOrderId: string
): Promise<void> {
  try {
    await db
      .update(serviceOrder)
      .set({
        utilizedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(serviceOrder.id, serviceOrderId));
  } catch (error) {
    console.error("Error marking service order as utilized:", error);
    throw error;
  }
}

/**
 * Link a service order to a call
 * @param serviceOrderId - The service order ID
 * @param callId - The call ID
 */
export async function linkServiceOrderToCall(
  serviceOrderId: string,
  callId: string
): Promise<void> {
  try {
    await db
      .update(serviceOrder)
      .set({
        callId,
        updatedAt: new Date(),
      })
      .where(eq(serviceOrder.id, serviceOrderId));
  } catch (error) {
    console.error("Error linking service order to call:", error);
    throw error;
  }
}

/**
 * Link a service order to a conversation
 * @param serviceOrderId - The service order ID
 * @param conversationId - The conversation ID
 */
export async function linkServiceOrderToConversation(
  serviceOrderId: string,
  conversationId: string
): Promise<void> {
  try {
    await db
      .update(serviceOrder)
      .set({
        conversationId,
        updatedAt: new Date(),
      })
      .where(eq(serviceOrder.id, serviceOrderId));
  } catch (error) {
    console.error("Error linking service order to conversation:", error);
    throw error;
  }
}

