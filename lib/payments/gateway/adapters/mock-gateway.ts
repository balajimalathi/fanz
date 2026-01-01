import {
  BaseGateway,
  PaymentInitiationRequest,
  PaymentInitiationResponse,
  PaymentStatusResponse,
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

  getName(): string {
    return "mock";
  }

  async initiatePayment(request: PaymentInitiationRequest): Promise<PaymentInitiationResponse> {
    // Generate mock transaction ID
    const transactionId = `mock_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // In test mode, immediately mark as completed
    const initialStatus = this.config.mode === "test" ? "completed" : "pending";

    // Store transaction
    MockGateway.transactions.set(transactionId, {
      orderId: request.orderId,
      status: initialStatus,
      amount: request.amount,
      currency: request.currency,
      createdAt: new Date(),
    });

    // Build payment URL - append gatewayTransactionId and status to existing returnUrl
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

  verifyWebhook(payload: WebhookPayload, signature: string): boolean {
    // In mock mode, always return true for testing
    // In production, this would verify the signature
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
      };
    } catch (error) {
      console.error("Error parsing webhook payload:", error);
      return null;
    }
  }

  /**
   * Helper method to manually update transaction status (for testing)
   */
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

  /**
   * Helper method to clear all transactions (for testing)
   */
  static clearTransactions(): void {
    MockGateway.transactions.clear();
  }
}

