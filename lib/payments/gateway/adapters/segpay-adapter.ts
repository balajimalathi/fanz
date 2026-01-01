import {
  BaseGateway,
  PaymentInitiationRequest,
  PaymentInitiationResponse,
  PaymentStatusResponse,
  WebhookPayload,
} from "./base-gateway";

/**
 * SegPay payment gateway adapter
 * TODO: Implement actual SegPay API integration
 */
export class SegPayAdapter extends BaseGateway {
  getName(): string {
    return "segpay";
  }

  async initiatePayment(request: PaymentInitiationRequest): Promise<PaymentInitiationResponse> {
    // TODO: Implement SegPay payment initiation
    throw new Error("SegPay adapter not yet implemented");
  }

  async checkPaymentStatus(transactionId: string): Promise<PaymentStatusResponse> {
    // TODO: Implement SegPay status check
    throw new Error("SegPay adapter not yet implemented");
  }

  verifyWebhook(payload: WebhookPayload, signature: string): boolean {
    // TODO: Implement SegPay webhook verification
    return false;
  }

  parseWebhook(payload: unknown): WebhookPayload | null {
    // TODO: Implement SegPay webhook parsing
    return null;
  }
}

