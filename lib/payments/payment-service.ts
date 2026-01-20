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
  liveStream,
  liveStreamPurchase,
  creator,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { GatewayService } from "./gateway/gateway-service";
import { calculateSplitPayment } from "./split-calculator";
import { env } from "@/env";
import { calculateBundlePrice, type BundleDuration } from "@/lib/utils/membership-pricing";
import { getCurrencyDecimals } from "@/lib/currency/currency-utils";

export type PaymentType = "membership" | "exclusive_post" | "service" | "live_stream" | "wallet_credit";

export interface InitiatePaymentRequest {
  userId: string;
  type: PaymentType;
  entityId: string; // membershipId, postId, serviceId, or planType for wallet_credit
  returnUrl?: string;
  duration?: number; // Duration in months (for membership subscriptions)
  originUrl?: string; // Origin URL for redirect after payment
  currency?: string; // User's preferred currency (ISO 4217). If not provided, will be detected.
  creatorId?: string; // Creator ID (required for wallet_credit type)
  customerDescription?: string; // Customer description/requirements (required for service type)
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

      // Currency will be determined from creator's currency (no user preference needed)

      // Get entity details and calculate amount
      let amount: number;
      let creatorId: string;
      let creatorCurrency: string;
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

          // Get creator to determine their currency
          const creatorRecord = await db.query.creator.findFirst({
            where: (c, { eq: eqOp }) => eqOp(c.id, membershipRecord.creatorId),
          });
          creatorCurrency = creatorRecord?.currency || "INR";

          // Calculate amount based on duration (bundle pricing)
          // Amount is stored in creator's currency subunits
          const monthlyPrice = membershipRecord.monthlyRecurringFee;
          const duration = (request.duration || 1) as BundleDuration;
          
          // Convert to display amount for calculation
          const creatorDecimals = getCurrencyDecimals(creatorCurrency);
          const monthlyPriceDisplay = monthlyPrice / Math.pow(10, creatorDecimals);
          const bundlePriceDisplay = calculateBundlePrice(monthlyPriceDisplay, duration);
          amount = Math.round(bundlePriceDisplay * Math.pow(10, creatorDecimals));

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

          // Get creator to determine their currency
          const creatorRecord = await db.query.creator.findFirst({
            where: (c, { eq: eqOp }) => eqOp(c.id, postRecord.creatorId),
          });
          creatorCurrency = creatorRecord?.currency || "INR";

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

          amount = postRecord.price; // Already in creator's currency subunits
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

          // Get creator to determine their currency
          const creatorRecord = await db.query.creator.findFirst({
            where: (c, { eq: eqOp }) => eqOp(c.id, serviceRecord.creatorId),
          });
          creatorCurrency = creatorRecord?.currency || "INR";

          amount = serviceRecord.price; // Already in creator's currency subunits
          creatorId = serviceRecord.creatorId;
          orderId = `service_${request.entityId}_${Date.now()}`;
          break;
        }

        case "live_stream": {
          const streamRecord = await db.query.liveStream.findFirst({
            where: (ls, { eq: eqOp }) => eqOp(ls.id, request.entityId),
          });

          if (!streamRecord || !streamRecord.price || streamRecord.streamType !== "paid") {
            return {
              success: false,
              error: "Stream not found or not available for purchase",
            };
          }

          // Get creator to determine their currency
          const creatorRecord = await db.query.creator.findFirst({
            where: (c, { eq: eqOp }) => eqOp(c.id, streamRecord.creatorId),
          });
          creatorCurrency = creatorRecord?.currency || "INR";

          // Check if user already purchased this stream
          const existingPurchase = await db.query.liveStreamPurchase.findFirst({
            where: (lsp, { eq: eqOp, and: andOp }) =>
              andOp(
                eqOp(lsp.userId, request.userId),
                eqOp(lsp.liveStreamId, request.entityId)
              ),
          });

          if (existingPurchase) {
            return {
              success: false,
              error: "You have already purchased access to this stream",
            };
          }

          // Check if stream is active
          if (streamRecord.status !== "active") {
            return {
              success: false,
              error: "Stream is not active",
            };
          }

          amount = streamRecord.price; // Already in creator's currency subunits
          creatorId = streamRecord.creatorId;
          orderId = `live_stream_${request.entityId}_${Date.now()}`;
          break;
        }

        case "wallet_credit": {
          // entityId contains the plan type: 'starter', 'favorite', or 'vip'
          const planType = request.entityId;
          const { env } = await import("@/env");

          let planCoins: number;
          let planPrice: number;
          let planBonus: number;

          switch (planType) {
            case "starter":
              planCoins = env.FAN_WALLET_STARTER_COINS;
              planPrice = env.FAN_WALLET_STARTER_PRICE;
              planBonus = env.FAN_WALLET_STARTER_BONUS;
              break;
            case "favorite":
              planCoins = env.FAN_WALLET_FAVORITE_COINS;
              planPrice = env.FAN_WALLET_FAVORITE_PRICE;
              planBonus = env.FAN_WALLET_FAVORITE_BONUS;
              break;
            case "vip":
              planCoins = env.FAN_WALLET_VIP_COINS;
              planPrice = env.FAN_WALLET_VIP_PRICE;
              planBonus = env.FAN_WALLET_VIP_BONUS;
              break;
            default:
              return {
                success: false,
                error: "Invalid credit plan type",
              };
          }

          // For wallet credits, creatorId is required (the creator whose page they were on)
          if (!request.creatorId) {
            return {
              success: false,
              error: "Creator ID is required for wallet credit purchase",
            };
          }

          // Get creator to determine their currency
          const creatorRecord = await db.query.creator.findFirst({
            where: (c, { eq: eqOp }) => eqOp(c.id, request.creatorId!),
          });
          creatorCurrency = creatorRecord?.currency || "INR";

          amount = planPrice; // Price in paise
          creatorId = request.creatorId; // Creator whose page they were on
          
          // For wallet_credit, we use a placeholder UUID for entityId since it's required to be UUID
          // The actual plan type is stored in metadata and fanWalletTransaction
          // Using a deterministic UUID based on "wallet_credit" prefix
          const { randomUUID } = await import("crypto");
          const placeholderEntityId = randomUUID(); // Generate a UUID for the entityId field
          orderId = `wallet_credit_${planType}_${Date.now()}`;

          // Store plan details in metadata for later use
          (request as any).planMetadata = {
            planType,
            coins: planCoins,
            bonus: planBonus,
            totalCoins: planCoins + planBonus,
          };
          
          // Store the placeholder entityId so we can use it in the insert
          (request as any).placeholderEntityId = placeholderEntityId;
          break;
        }

        default:
          return {
            success: false,
            error: "Invalid payment type",
          };
      }

      // Use creator's currency for payment (no conversion)
      const paymentAmount = amount;
      
      // Calculate split in creator's currency (assuming 1:1 with base currency for now)
      const split = calculateSplitPayment(amount);

      // Build metadata with duration and originUrl for all payment types
      const metadata: Record<string, unknown> = {
        type: request.type,
        entityId: request.entityId,
        creatorCurrency,
      };

      // Store originUrl for all payment types
      if (request.originUrl) {
        metadata.originUrl = request.originUrl;
      }

      // Store duration for membership payments
      if (request.type === "membership" && request.duration) {
        metadata.duration = request.duration;
      }

      // Store customerDescription for service payments
      if (request.type === "service" && request.customerDescription) {
        metadata.customerDescription = request.customerDescription;
      }

      // Store plan metadata for wallet credit purchases
      if (request.type === "wallet_credit" && (request as any).planMetadata) {
        metadata.planMetadata = (request as any).planMetadata;
      }

      // Store tip metadata (streamId, isTip) if present
      if ((request as any).metadata) {
        if ((request as any).metadata.streamId) {
          metadata.streamId = (request as any).metadata.streamId;
        }
        if ((request as any).metadata.isTip !== undefined) {
          metadata.isTip = (request as any).metadata.isTip;
        }
      }

      // For wallet_credit, use placeholder entityId; for others, use the actual entityId
      const entityIdForInsert = 
        request.type === "wallet_credit" 
          ? (request as any).placeholderEntityId || request.entityId
          : request.entityId;

      // Map PaymentType to database enum value
      // The database enum only supports "membership" and "service"
      // The actual type is stored in metadata for reference
      const dbType: "membership" | "service" = 
        request.type === "membership" ? "membership" : "service";

      // Create payment transaction
      const [transaction] = await db
        .insert(paymentTransaction)
        .values({
          userId: request.userId,
          creatorId,
          type: dbType,
          entityId: entityIdForInsert,
          amount: paymentAmount, // Amount in INR subunits
          originalCurrency: "INR",
          baseCurrency: "INR", // All transactions use INR
          convertedAmount: paymentAmount, // Same as amount (no conversion)
          exchangeRate: "1.0", // No conversion
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
        amount: paymentAmount, // Amount in INR subunits
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
    // Get actual payment type from metadata (since DB enum only stores "membership" or "service")
    const actualType = (transaction.metadata?.type as PaymentType) || transaction.type;
    
    switch (actualType) {
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
              price: membershipRecord.monthlyRecurringFee,
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
            price: membershipRecord.monthlyRecurringFee,
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
        // Get customerDescription from transaction metadata
        const customerDescription = transaction.metadata?.customerDescription as string | undefined;
        
        // Create service order
        await db.insert(serviceOrder).values({
          userId: transaction.userId,
          creatorId: transaction.creatorId,
          serviceId: transaction.entityId,
          transactionId: transaction.id,
          status: "pending",
          customerDescription: customerDescription || null,
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

      case "live_stream": {
        // Create live stream purchase record
        await db.insert(liveStreamPurchase).values({
          userId: transaction.userId,
          liveStreamId: transaction.entityId,
          paymentTransactionId: transaction.id,
        });

        // Send notification to creator
        const streamRecord = await db.query.liveStream.findFirst({
          where: (ls, { eq: eqOp }) => eqOp(ls.id, transaction.entityId),
        });

        if (streamRecord) {
          const user = await db.query.user.findFirst({
            where: (u, { eq: eqOp }) => eqOp(u.id, transaction.userId),
          });

          await db.insert(notification).values({
            userId: transaction.creatorId,
            type: "live_stream_purchase",
            title: "Live Stream Purchase",
            message: `${user?.name || "A user"} purchased access to your live stream`,
            link: `/home/live`,
          });

          // Publish collection update for entry fee
          if (streamRecord.status === "active") {
            try {
              const { publishCollectionUpdate } = await import("@/lib/utils/redis-pubsub");
              const { calculateStreamCollection } = await import("@/lib/services/live-stream-collection-service");
              
              const creator = await db.query.creator.findFirst({
                where: (c, { eq: eqOp }) => eqOp(c.id, streamRecord.creatorId),
              });
              const currency = creator?.currency || "USD";
              
              // Calculate current collection
              const collection = await calculateStreamCollection(transaction.entityId, currency);
              
              await publishCollectionUpdate(transaction.entityId, {
                type: "collection_update",
                streamId: transaction.entityId,
                total: collection.total,
                currency,
                entryFees: collection.entryFees,
                tips: collection.tips,
                timestamp: Date.now(),
              });
            } catch (error) {
              console.error("Error publishing collection update for live stream purchase:", error);
              // Don't throw - graceful degradation
            }
          }
        }
        break;
      }

      case "wallet_credit": {
        // Check if this is a tip (has streamId in metadata) or a coin purchase (has planMetadata)
        const streamId = transaction.metadata?.streamId as string | undefined;
        const isTip = transaction.metadata?.isTip as boolean | undefined;
        
        if (isTip && streamId) {
          // This is a tip during a live stream
          // Publish collection update for tip
          try {
            const { publishCollectionUpdate } = await import("@/lib/utils/redis-pubsub");
            const { calculateStreamCollection } = await import("@/lib/services/live-stream-collection-service");
            
            // Verify stream is active
            const streamRecord = await db.query.liveStream.findFirst({
              where: (ls, { eq: eqOp }) => eqOp(ls.id, streamId),
            });

            if (streamRecord && streamRecord.status === "active") {
              const creator = await db.query.creator.findFirst({
                where: (c, { eq: eqOp }) => eqOp(c.id, transaction.creatorId),
              });
              const currency = creator?.currency || "USD";
              
              // Calculate current collection
              const collection = await calculateStreamCollection(streamId, currency);
              
              await publishCollectionUpdate(streamId, {
                type: "collection_update",
                streamId,
                total: collection.total,
                currency,
                entryFees: collection.entryFees,
                tips: collection.tips,
                timestamp: Date.now(),
              });
            }
          } catch (error) {
            console.error("Error publishing collection update for tip:", error);
            // Don't throw - graceful degradation
          }
        } else {
          // This is a coin purchase
          const planMetadata = transaction.metadata?.planMetadata as {
            planType: string;
            coins: number;
            bonus: number;
            totalCoins: number;
          } | undefined;

          if (!planMetadata) {
            console.error("Plan metadata not found for wallet credit transaction");
            return;
          }

          const { WalletService } = await import("@/lib/wallet/wallet-service");
          await WalletService.addCredits(
            transaction.userId,
            planMetadata.totalCoins, // Add base coins + bonus
            transaction.id, // Link to payment transaction
            `Purchased ${planMetadata.totalCoins} credits (${planMetadata.coins} + ${planMetadata.bonus} bonus) via ${planMetadata.planType} plan`,
            {
              planType: planMetadata.planType,
              baseCoins: planMetadata.coins,
              bonusCoins: planMetadata.bonus,
              paymentTransactionId: transaction.id,
            }
          );
        }
        break;
      }
    }
  }
}

