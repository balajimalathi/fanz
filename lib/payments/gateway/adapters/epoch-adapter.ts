import {
  BaseGateway,
  PaymentInitiationRequest,
  PaymentInitiationResponse,
  PaymentStatusResponse,
  WebhookPayload,
} from "./base-gateway";

/**
 * Epoch payment gateway adapter
 * TODO: Implement actual Epoch API integration
 */
export class EpochAdapter extends BaseGateway {
  getName(): string {
    return "epoch";
  }

  async initiatePayment(request: PaymentInitiationRequest): Promise<PaymentInitiationResponse> {
    // TODO: Implement Epoch payment initiation
    throw new Error("Epoch adapter not yet implemented");
  }

  async checkPaymentStatus(transactionId: string): Promise<PaymentStatusResponse> {
    // TODO: Implement Epoch status check
    throw new Error("Epoch adapter not yet implemented");
  }

  verifyWebhook(payload: WebhookPayload, signature: string): boolean {
    // TODO: Implement Epoch webhook verification
    return false;
  }

  parseWebhook(payload: unknown): WebhookPayload | null {
    // TODO: Implement Epoch webhook parsing
    return null;
  }
}

