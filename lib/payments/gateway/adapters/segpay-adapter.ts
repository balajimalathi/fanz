import {
  BaseGateway,
  GatewayConfig,
  PaymentInitiationRequest,
  PaymentInitiationResponse,
  PaymentStatusResponse,
  RefundRequest,
  RefundResponse,
  WebhookPayload,
} from "./base-gateway";

/**
 * SegPay payment gateway adapter
 * TODO: Implement actual SegPay API integration
 */
export class SegPayAdapter extends BaseGateway {
  constructor(config: GatewayConfig) {
    super(config);
  }

  getName(): string {
    return "segpay";
  }

  getSupportedCurrencies(): string[] {
    return ["USD", "EUR", "GBP"];
  }

  async initiatePayment(_request: PaymentInitiationRequest): Promise<PaymentInitiationResponse> {
    throw new Error("SegPay adapter not yet implemented");
  }

  async checkPaymentStatus(_transactionId: string): Promise<PaymentStatusResponse> {
    throw new Error("SegPay adapter not yet implemented");
  }

  verifyWebhook(_payload: WebhookPayload, _signature: string): boolean {
    return false;
  }

  parseWebhook(_payload: unknown): WebhookPayload | null {
    return null;
  }

  async refund(_request: RefundRequest): Promise<RefundResponse> {
    return { success: false, error: "SegPay adapter not yet implemented" };
  }
}
