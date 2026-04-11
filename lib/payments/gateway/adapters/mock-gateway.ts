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
 * Mock payment gateway for testing
 * Simulates payment processing without actual gateway integration
 */
export class MockGateway extends BaseGateway {
  // In-memory store for mock transactions
  private static transactions = new Map<
    string,
    {
      orderId: string;
      status: "pending" | "processing" | "completed" | "failed" | "cancelled";
      amount: number;
      currency: string;
      createdAt: Date;
    }
  >();

  constructor(config: GatewayConfig) {
    super(config);
  }

  getName(): string {
    return "mock";
  }

  getSupportedCurrencies(): string[] {
    return ["INR", "USD", "EUR", "GBP"];
  }

  async initiatePayment(request: PaymentInitiationRequest): Promise<PaymentInitiationResponse> {
    const transactionId = `mock_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const initialStatus = this.config.mode === "test" ? "completed" : "pending";

    MockGateway.transactions.set(transactionId, {
      orderId: request.orderId,
      status: initialStatus,
      amount: request.amount,
      currency: request.currency,
      createdAt: new Date(),
    });

    const separator = request.returnUrl.includes("?") ? "&" : "?";
    const paymentUrl = `${request.returnUrl}${separator}gatewayTransactionId=${transactionId}&status=${initialStatus}`;

    return {
      success: true,
      paymentUrl,
      transactionId,
    };
  }

  async checkPaymentStatus(transactionId: string): Promise<PaymentStatusResponse> {
    const transaction = MockGateway.transactions.get(transactionId);

    if (!transaction) {
      return {
        success: false,
        status: "failed",
        error: "Transaction not found",
      };
    }

    return {
      success: true,
      status: transaction.status,
      transactionId,
      amount: transaction.amount,
      currency: transaction.currency,
    };
  }

  verifyWebhook(_payload: WebhookPayload, _signature: string): boolean {
    return true;
  }

  parseWebhook(payload: unknown): WebhookPayload | null {
    try {
      if (typeof payload !== "object" || payload === null) {
        return null;
      }

      const data = payload as Record<string, unknown>;

      return {
        transactionId: String(data.transactionId || ""),
        orderId: String(data.orderId || ""),
        status: (data.status as WebhookPayload["status"]) || "pending",
        amount: Number(data.amount || 0),
        currency: String(data.currency || "INR"),
        signature: data.signature as string | undefined,
        metadata: data.metadata as Record<string, unknown> | undefined,
        webhookEventId: data.webhookEventId as string | undefined,
      };
    } catch (error) {
      console.error("Error parsing webhook payload:", error);
      return null;
    }
  }

  async refund(_request: RefundRequest): Promise<RefundResponse> {
    return { success: false, error: "Mock gateway does not support refunds" };
  }

  static updateTransactionStatus(
    transactionId: string,
    status: "pending" | "processing" | "completed" | "failed" | "cancelled"
  ): boolean {
    const transaction = MockGateway.transactions.get(transactionId);
    if (transaction) {
      transaction.status = status;
      return true;
    }
    return false;
  }

  static clearTransactions(): void {
    MockGateway.transactions.clear();
  }
}
