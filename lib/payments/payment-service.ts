import { db } from "@/lib/db/client";
import {
  paymentTransaction,
  postPurchase,
  serviceOrder,
  subscriptions,
  customers,
  membership,
  post,
  service,
  notification,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { GatewayService } from "./gateway/gateway-service";
import { calculateSplitPayment } from "./split-calculator";
import { env } from "@/env";
import { calculateBundlePrice, type BundleDuration } from "@/lib/utils/membership-pricing";

export type PaymentType = "membership" | "exclusive_post" | "service";

export interface InitiatePaymentRequest {
  userId: string;
  type: PaymentType;
  entityId: string; // membershipId, postId, or serviceId
  returnUrl?: string;
  duration?: number; // Duration in months (for membership subscriptions)
  originUrl?: string; // Origin URL for redirect after payment
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  paymentUrl?: string;
  error?: string;
}

/**
 * Payment Service
 * Handles payment processing, transaction management, and access granting
 */
export class PaymentService {
  /**
   * Check if payment gateway is active
   */
  static isGatewayActive(): boolean {
    return GatewayService.isActive();
  }

  /**
   * Initiate a payment
   */
  static async initiatePayment(request: InitiatePaymentRequest): Promise<PaymentResult> {
    // Check if gateway is active
    if (!this.isGatewayActive()) {
      return {
        success: false,
        error: "Payment gateway is not available. Please try again later.",
      };
    }

    try {
      // Get user details
      const user = await db.query.user.findFirst({
        where: (u, { eq: eqOp }) => eqOp(u.id, request.userId),
      });

      if (!user) {
        return {
          success: false,
          error: "User not found",
        };
      }

      // Get entity details and calculate amount
      let amount: number;
      let creatorId: string;
      let orderId: string;

      switch (request.type) {
        case "membership": {
          const membershipRecord = await db.query.membership.findFirst({
            where: (m, { eq: eqOp }) => eqOp(m.id, request.entityId),
          });

          if (!membershipRecord) {
            return {
              success: false,
              error: "Membership not found",
            };
          }

          // Calculate amount based on duration (bundle pricing)
          const monthlyPrice = membershipRecord.monthlyRecurringFee; // Already in paise
          const duration = (request.duration || 1) as BundleDuration;
          
          // Convert to rupees for calculation, then back to paise
          const monthlyPriceInRupees = monthlyPrice / 100;
          const bundlePriceInRupees = calculateBundlePrice(monthlyPriceInRupees, duration);
          amount = bundlePriceInRupees * 100; // Convert back to paise

          creatorId = membershipRecord.creatorId;
          orderId = `membership_${request.entityId}_${Date.now()}`;
          break;
        }

        case "exclusive_post": {
          const postRecord = await db.query.post.findFirst({
            where: (p, { eq: eqOp }) => eqOp(p.id, request.entityId),
          });

          if (!postRecord || !postRecord.price) {
            return {
              success: false,
              error: "Post not found or not available for purchase",
            };
          }

          // Check if user already purchased this post
          const existingPurchase = await db.query.postPurchase.findFirst({
            where: (pp, { eq: eqOp, and: andOp }) =>
              andOp(eqOp(pp.userId, request.userId), eqOp(pp.postId, request.entityId)),
          });

          if (existingPurchase) {
            return {
              success: false,
              error: "You have already purchased this post",
            };
          }

          amount = postRecord.price;
          creatorId = postRecord.creatorId;
          orderId = `post_${request.entityId}_${Date.now()}`;
          break;
        }

        case "service": {
          const serviceRecord = await db.query.service.findFirst({
            where: (s, { eq: eqOp }) => eqOp(s.id, request.entityId),
          });

          if (!serviceRecord) {
            return {
              success: false,
              error: "Service not found",
            };
          }

          amount = serviceRecord.price;
          creatorId = serviceRecord.creatorId;
          orderId = `service_${request.entityId}_${Date.now()}`;
          break;
        }

        default:
          return {
            success: false,
            error: "Invalid payment type",
          };
      }

      // Calculate split payment
      const split = calculateSplitPayment(amount);

      // Build metadata with duration and originUrl for all payment types
      const metadata: Record<string, unknown> = {
        type: request.type,
        entityId: request.entityId,
      };

      // Store originUrl for all payment types
      if (request.originUrl) {
        metadata.originUrl = request.originUrl;
      }

      // Store duration for membership payments
      if (request.type === "membership" && request.duration) {
        metadata.duration = request.duration;
      }

      // Create payment transaction
      const [transaction] = await db
        .insert(paymentTransaction)
        .values({
          userId: request.userId,
          creatorId,
          type: request.type,
          entityId: request.entityId,
          amount: split.totalAmount,
          platformFee: split.platformFee,
          creatorAmount: split.creatorAmount,
          status: "pending",
          metadata,
        })
        .returning();

      // Prepare return URL
      const baseUrl = env.NEXT_PUBLIC_APP_URL;
      const returnUrl =
        request.returnUrl || `${baseUrl}/api/payments/callback?transactionId=${transaction.id}`;
      const webhookUrl = `${baseUrl}/api/payments/webhook`;

      // Add transactionId to metadata for gateway
      const gatewayMetadata = {
        ...metadata,
        transactionId: transaction.id,
      };

      // Initiate payment with gateway
      const gatewayResponse = await GatewayService.initiatePayment({
        amount: split.totalAmount,
        currency: "INR",
        orderId,
        customerId: request.userId,
        customerEmail: user.email,
        customerName: user.name,
        returnUrl,
        webhookUrl,
        metadata: gatewayMetadata,
      });

      if (!gatewayResponse.success || !gatewayResponse.paymentUrl) {
        // Update transaction status to failed
        await db
          .update(paymentTransaction)
          .set({
            status: "failed",
            updatedAt: new Date(),
          })
          .where(eq(paymentTransaction.id, transaction.id));

        return {
          success: false,
          error: gatewayResponse.error || "Failed to initiate payment",
        };
      }

      // Update transaction with gateway transaction ID
      await db
        .update(paymentTransaction)
        .set({
          gatewayTransactionId: gatewayResponse.transactionId,
          updatedAt: new Date(),
        })
        .where(eq(paymentTransaction.id, transaction.id));

      return {
        success: true,
        transactionId: transaction.id,
        paymentUrl: gatewayResponse.paymentUrl,
      };
    } catch (error) {
      console.error("Error initiating payment:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to initiate payment",
      };
    }
  }

  /**
   * Process payment completion (called from webhook or callback)
   */
  static async processPaymentCompletion(
    transactionId: string,
    status: "completed" | "failed" | "cancelled"
  ): Promise<void> {
    try {
      // Get transaction
      const transaction = await db.query.paymentTransaction.findFirst({
        where: (pt, { eq: eqOp }) => eqOp(pt.id, transactionId),
      });

      if (!transaction) {
        console.error(`Transaction not found: ${transactionId}`);
        return;
      }

      // Update transaction status
      await db
        .update(paymentTransaction)
        .set({
          status,
          updatedAt: new Date(),
        })
        .where(eq(paymentTransaction.id, transactionId));

      // If payment is completed, grant access
      if (status === "completed") {
        await this.grantAccess(transaction);
      }
    } catch (error) {
      console.error("Error processing payment completion:", error);
      throw error;
    }
  }

  /**
   * Grant access based on payment type
   */
  private static async grantAccess(transaction: typeof paymentTransaction.$inferSelect): Promise<void> {
    switch (transaction.type) {
      case "membership": {
        // Create or update subscription
        const membershipRecord = await db.query.membership.findFirst({
          where: (m, { eq: eqOp }) => eqOp(m.id, transaction.entityId),
        });

        if (!membershipRecord) {
          console.error(`Membership not found: ${transaction.entityId}`);
          return;
        }

        // Get user
        const user = await db.query.user.findFirst({
          where: (u, { eq: eqOp }) => eqOp(u.id, transaction.userId),
        });

        if (!user) {
          console.error(`User not found: ${transaction.userId}`);
          return;
        }

        // Find or create customer
        let customer = await db.query.customers.findFirst({
          where: (c, { eq: eqOp }) => eqOp(c.email, user.email),
        });

        if (!customer) {
          const [newCustomer] = await db
            .insert(customers)
            .values({
              email: user.email,
              name: user.name,
            })
            .returning();
          customer = newCustomer;
        }

        // Create or update subscription
        const now = new Date();
        const periodEnd = new Date(now);
        
        // Extract duration from metadata (default to 1 month if not found)
        const duration = (transaction.metadata?.duration as number) || 1;
        periodEnd.setMonth(periodEnd.getMonth() + duration);

        // Check if subscription already exists
        const existingSubscription = await db.query.subscriptions.findFirst({
          where: (s, { eq: eqOp, and: andOp }) =>
            andOp(eqOp(s.customerId, customer.id), eqOp(s.planId, transaction.entityId)),
        });

        if (existingSubscription) {
          // Update existing subscription
          await db
            .update(subscriptions)
            .set({
              status: "active",
              currentPeriodStart: now,
              currentPeriodEnd: periodEnd,
              updatedAt: new Date(),
            })
            .where(eq(subscriptions.id, existingSubscription.id));
        } else {
          // Create new subscription
          await db.insert(subscriptions).values({
            customerId: customer.id,
            planId: transaction.entityId,
            status: "active",
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
          });
        }

        // Send notification to creator
        await db.insert(notification).values({
          userId: transaction.creatorId,
          type: "membership_subscription",
          title: "New Membership Subscription",
          message: `User ${user.name} subscribed to your membership`,
          link: `/home/memberships`,
        });
        break;
      }

      case "exclusive_post": {
        // Create post purchase record
        await db.insert(postPurchase).values({
          userId: transaction.userId,
          postId: transaction.entityId,
          transactionId: transaction.id,
        });

        // Send notification to creator
        const postRecord = await db.query.post.findFirst({
          where: (p, { eq: eqOp }) => eqOp(p.id, transaction.entityId),
        });

        if (postRecord) {
          const user = await db.query.user.findFirst({
            where: (u, { eq: eqOp }) => eqOp(u.id, transaction.userId),
          });

          await db.insert(notification).values({
            userId: transaction.creatorId,
            type: "post_purchase",
            title: "Post Purchased",
            message: `${user?.name || "A user"} purchased your exclusive post`,
            link: `/home/posts/${transaction.entityId}`,
          });
        }
        break;
      }

      case "service": {
        // Create service order
        await db.insert(serviceOrder).values({
          userId: transaction.userId,
          creatorId: transaction.creatorId,
          serviceId: transaction.entityId,
          transactionId: transaction.id,
          status: "pending",
        });

        // Send notification to creator
        const serviceRecord = await db.query.service.findFirst({
          where: (s, { eq: eqOp }) => eqOp(s.id, transaction.entityId),
        });

        if (serviceRecord) {
          const user = await db.query.user.findFirst({
            where: (u, { eq: eqOp }) => eqOp(u.id, transaction.userId),
          });

          await db.insert(notification).values({
            userId: transaction.creatorId,
            type: "service_order",
            title: "New Service Order",
            message: `${user?.name || "A user"} ordered your service: ${serviceRecord.name}`,
            link: `/home/orders`,
          });
        }
        break;
      }
    }
  }
}

