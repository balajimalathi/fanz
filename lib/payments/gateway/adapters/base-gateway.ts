/**
 * Base abstract class for payment gateway adapters
 * All gateway implementations must extend this class
 */

export interface GatewayConfig {
  apiKey?: string;
  secretKey?: string;
  merchantId?: string;
  webhookSecret?: string;
  mode: "live" | "test";
  additionalConfig?: Record<string, unknown>;
}

export interface PaymentInitiationRequest {
  amount: number; // Amount in smallest currency unit (e.g. paise)
  currency: string; // Currency code (e.g. "INR", "USD")
  orderId: string; // Unique order ID
  customerId: string; // User ID
  customerEmail: string; // User email
  customerName?: string; // User name
  returnUrl: string; // URL to redirect after payment
  webhookUrl: string; // URL for payment webhook
  metadata?: Record<string, unknown>; // Additional metadata
  /** Idempotency key for PSPs that support it (Stripe, etc.) */
  idempotencyKey?: string;
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
  /** PSP-specific event id for deduplication */
  webhookEventId?: string;
}

export interface RefundRequest {
  gatewayTransactionId: string;
  amount: number;
  currency: string;
  reason?: string;
}

export interface RefundResponse {
  success: boolean;
  refundId?: string;
  error?: string;
}

export abstract class BaseGateway {
  protected config: GatewayConfig;

  constructor(config: GatewayConfig) {
    this.config = config;
  }

  abstract getName(): string;

  abstract getSupportedCurrencies(): string[];

  abstract initiatePayment(request: PaymentInitiationRequest): Promise<PaymentInitiationResponse>;

  abstract checkPaymentStatus(transactionId: string): Promise<PaymentStatusResponse>;

  abstract verifyWebhook(payload: WebhookPayload, signature: string): boolean;

  abstract parseWebhook(payload: unknown): WebhookPayload | null;

  abstract refund(request: RefundRequest): Promise<RefundResponse>;

  supportsDirectPayout(): boolean {
    return false;
  }

  supportsCurrency(currency: string): boolean {
    const c = currency.toUpperCase();
    return this.getSupportedCurrencies().includes(c);
  }
}
