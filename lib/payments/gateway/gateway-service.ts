import { env } from "@/env";
import { createMockGateway, areRealPaymentGatewaysEnabled } from "./gateway-factory";
import type { PaymentStatusResponse, WebhookPayload } from "./adapters/base-gateway";
import { GatewayRegistry } from "./gateway-registry";

/**
 * Facade for status checks and the legacy generic webhook route.
 * Initiation is handled only by {@link PaymentService} + {@link PaymentOrchestrator}.
 */
export class GatewayService {
  /**
   * Whether the app accepts payment attempts (always true).
   * Use {@link areRealPaymentGatewaysEnabled} / `PAYMENT_GATEWAY_ENABLED` for PSP vs mock.
   */
  static isActive(): boolean {
    return true;
  }

  static async checkPaymentStatus(
    gatewayTransactionId: string,
    gatewayName?: string | null
  ): Promise<PaymentStatusResponse> {
    if (!areRealPaymentGatewaysEnabled()) {
      return createMockGateway().checkPaymentStatus(gatewayTransactionId);
    }

    if (gatewayName) {
      const adapter = await GatewayRegistry.getGateway(gatewayName);
      if (adapter) {
        return await adapter.checkPaymentStatus(gatewayTransactionId);
      }
    }

    return createMockGateway().checkPaymentStatus(gatewayTransactionId);
  }

  /**
   * Legacy `/api/payments/webhook` handler: only meaningful for mock payloads when real gateways are off.
   * Production PSPs should use `/api/payments/webhook/{stripe|…}`.
   */
  static async processWebhook(payload: unknown, signature: string): Promise<WebhookPayload | null> {
    if (!areRealPaymentGatewaysEnabled()) {
      const mock = createMockGateway();
      const parsedPayload = mock.parseWebhook(payload);
      if (!parsedPayload) return null;
      if (!mock.verifyWebhook(parsedPayload, signature)) return null;
      return parsedPayload;
    }

    console.error(
      "Generic /api/payments/webhook is disabled when PAYMENT_GATEWAY_ENABLED=true; configure PSP URLs under /api/payments/webhook/{stripe|razorpay|paypal|paytm|dodo}"
    );
    return null;
  }
}
