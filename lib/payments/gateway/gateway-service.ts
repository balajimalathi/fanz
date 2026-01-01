import { isGatewayEnabled, createGateway } from "./gateway-factory";
import {
  PaymentInitiationRequest,
  PaymentInitiationResponse,
  PaymentStatusResponse,
  WebhookPayload,
} from "./adapters/base-gateway";

/**
 * Payment Gateway Service
 * Main service for interacting with payment gateway
 */
export class GatewayService {
  /**
   * Check if payment gateway is active and enabled
   */
  static isActive(): boolean {
    return isGatewayEnabled();
  }

  /**
   * Initialize a payment
   */
  static async initiatePayment(
    request: PaymentInitiationRequest
  ): Promise<PaymentInitiationResponse> {
    if (!this.isActive()) {
      return {
        success: false,
        error: "Payment gateway is not enabled",
      };
    }

    try {
      const gateway = createGateway();
      return await gateway.initiatePayment(request);
    } catch (error) {
      console.error("Error initiating payment:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to initiate payment",
      };
    }
  }

  /**
   * Check payment status
   */
  static async checkPaymentStatus(transactionId: string): Promise<PaymentStatusResponse> {
    if (!this.isActive()) {
      return {
        success: false,
        status: "failed",
        error: "Payment gateway is not enabled",
      };
    }

    try {
      const gateway = createGateway();
      return await gateway.checkPaymentStatus(transactionId);
    } catch (error) {
      console.error("Error checking payment status:", error);
      return {
        success: false,
        status: "failed",
        error: error instanceof Error ? error.message : "Failed to check payment status",
      };
    }
  }

  /**
   * Verify and parse webhook
   */
  static async processWebhook(
    payload: unknown,
    signature: string
  ): Promise<WebhookPayload | null> {
    if (!this.isActive()) {
      console.warn("Payment gateway is not enabled, ignoring webhook");
      return null;
    }

    try {
      const gateway = createGateway();
      const parsedPayload = gateway.parseWebhook(payload);

      if (!parsedPayload) {
        console.error("Failed to parse webhook payload");
        return null;
      }

      // Verify webhook signature
      if (!gateway.verifyWebhook(parsedPayload, signature)) {
        console.error("Webhook signature verification failed");
        return null;
      }

      return parsedPayload;
    } catch (error) {
      console.error("Error processing webhook:", error);
      return null;
    }
  }
}

