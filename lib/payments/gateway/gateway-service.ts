import { env } from "@/env";
import { isGatewayEnabled, createGateway } from "./gateway-factory";
import {
  PaymentInitiationRequest,
  PaymentInitiationResponse,
  PaymentStatusResponse,
  WebhookPayload,
} from "./adapters/base-gateway";
import { GatewayRegistry } from "./gateway-registry";

/**
 * Payment Gateway Service
 * Main service for interacting with payment gateway
 */
export class GatewayService {
  static isActive(): boolean {
    return isGatewayEnabled();
  }

  /**
   * Initialize a payment (legacy single-gateway path; prefer PaymentOrchestrator from PaymentService).
   */
  static async initiatePayment(request: PaymentInitiationRequest): Promise<PaymentInitiationResponse> {
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
   * Check payment status at the PSP.
   * @param gatewayTransactionId — PSP reference (e.g. Stripe session id, Paytm order id)
   * @param gatewayName — when set, uses that adapter; otherwise legacy factory gateway
   */
  static async checkPaymentStatus(
    gatewayTransactionId: string,
    gatewayName?: string | null
  ): Promise<PaymentStatusResponse> {
    if (!this.isActive()) {
      return {
        success: false,
        status: "failed",
        error: "Payment gateway is not enabled",
      };
    }

    try {
      if (env.PAYMENT_GATEWAY_MODE === "test") {
        const gateway = createGateway();
        return await gateway.checkPaymentStatus(gatewayTransactionId);
      }

      if (gatewayName) {
        const adapter = await GatewayRegistry.getGateway(gatewayName);
        if (adapter) {
          return await adapter.checkPaymentStatus(gatewayTransactionId);
        }
      }

      const gateway = createGateway();
      return await gateway.checkPaymentStatus(gatewayTransactionId);
    } catch (error) {
      console.error("Error checking payment status:", error);
      return {
        success: false,
        status: "failed",
        error: error instanceof Error ? error.message : "Failed to check payment status",
      };
    }
  }

  static async processWebhook(payload: unknown, signature: string): Promise<WebhookPayload | null> {
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
