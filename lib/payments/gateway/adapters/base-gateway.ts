/**
 * Base abstract class for payment gateway adapters
 * All gateway implementations must extend this class
 */
export interface PaymentInitiationRequest {
  amount: number; // Amount in paise (smallest currency unit)
  currency: string; // Currency code (e.g., "INR", "USD")
  orderId: string; // Unique order ID
  customerId: string; // User ID
  customerEmail: string; // User email
  customerName?: string; // User name
  returnUrl: string; // URL to redirect after payment
  webhookUrl: string; // URL for payment webhook
  metadata?: Record<string, unknown>; // Additional metadata
}

export interface PaymentInitiationResponse {
  success: boolean;
  paymentUrl?: string; // URL to redirect user for payment
  transactionId?: string; // Gateway transaction ID
  error?: string; // Error message if failed
}

export interface PaymentStatusResponse {
  success: boolean;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  transactionId?: string;
  amount?: number;
  currency?: string;
  error?: string;
}

export interface WebhookPayload {
  transactionId: string;
  orderId: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  amount: number;
  currency: string;
  signature?: string; // For webhook verification
  metadata?: Record<string, unknown>;
}

export abstract class BaseGateway {
  protected config: {
    apiKey?: string;
    secretKey?: string;
    merchantId?: string;
    webhookSecret?: string;
    mode: "live" | "test";
  };

  constructor(config: {
    apiKey?: string;
    secretKey?: string;
    merchantId?: string;
    webhookSecret?: string;
    mode: "live" | "test";
  }) {
    this.config = config;
  }

  /**
   * Initialize a payment and return payment URL
   */
  abstract initiatePayment(request: PaymentInitiationRequest): Promise<PaymentInitiationResponse>;

  /**
   * Check payment status
   */
  abstract checkPaymentStatus(transactionId: string): Promise<PaymentStatusResponse>;

  /**
   * Verify webhook signature
   */
  abstract verifyWebhook(payload: WebhookPayload, signature: string): boolean;

  /**
   * Parse webhook payload
   */
  abstract parseWebhook(payload: unknown): WebhookPayload | null;

  /**
   * Get gateway name
   */
  abstract getName(): string;
}

