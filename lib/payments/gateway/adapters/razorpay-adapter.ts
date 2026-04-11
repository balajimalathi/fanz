import crypto from "node:crypto";
import Razorpay from "razorpay";
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

type RazorpayPaymentLink = {
  id: string;
  short_url: string;
  amount: number;
  currency: string;
  status: string;
};

export class RazorpayAdapter extends BaseGateway {
  private client: Razorpay;

  constructor(config: GatewayConfig) {
    super(config);
    const keyId = config.apiKey;
    const keySecret = config.secretKey;
    if (!keyId || !keySecret) {
      throw new Error("Razorpay key id and secret are required");
    }
    this.client = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }

  getName(): string {
    return "razorpay";
  }

  getSupportedCurrencies(): string[] {
    return ["INR", "USD"];
  }

  supportsDirectPayout(): boolean {
    return true;
  }

  async initiatePayment(request: PaymentInitiationRequest): Promise<PaymentInitiationResponse> {
    try {
      const internalTxId = String(request.metadata?.transactionId || "");
      const link = (await this.client.paymentLink.create({
        amount: request.amount,
        currency: request.currency,
        accept_partial: false,
        description: `Order ${request.orderId}`,
        customer: {
          email: request.customerEmail,
          name: request.customerName,
        },
        notify: { sms: false, email: true },
        reminder_enable: true,
        callback_url: request.returnUrl,
        callback_method: "get",
        notes: {
          orderId: request.orderId,
          transactionId: internalTxId,
          userId: request.customerId,
        },
      })) as unknown as RazorpayPaymentLink;

      if (!link.short_url) {
        return { success: false, error: "Razorpay did not return payment URL" };
      }
      return {
        success: true,
        paymentUrl: link.short_url,
        transactionId: link.id,
      };
    } catch (e) {
      const err = e as { error?: { description?: string }; message?: string };
      const msg = err?.error?.description || err?.message || "Razorpay initiate failed";
      return { success: false, error: msg };
    }
  }

  async checkPaymentStatus(paymentLinkId: string): Promise<PaymentStatusResponse> {
    try {
      const link = (await this.client.paymentLink.fetch(paymentLinkId)) as unknown as RazorpayPaymentLink;
      let status: PaymentStatusResponse["status"] = "pending";
      if (link.status === "paid") status = "completed";
      else if (link.status === "expired" || link.status === "cancelled") status = "cancelled";
      else if (link.status === "partially_paid") status = "processing";

      return {
        success: true,
        status,
        transactionId: paymentLinkId,
        amount: link.amount,
        currency: (link.currency || "INR").toUpperCase(),
      };
    } catch (e) {
      return {
        success: false,
        status: "failed",
        error: e instanceof Error ? e.message : "Razorpay status failed",
      };
    }
  }

  verifyWebhook(_payload: WebhookPayload, _signature: string): boolean {
    return true;
  }

  parseWebhook(payload: unknown): WebhookPayload | null {
    try {
      const body = payload as Record<string, unknown>;
      const event = String(body.event || "");
      const pl = body.payload as
        | {
            payment_link?: { entity?: { id?: string; amount?: number; currency?: string; status?: string } };
            payment?: { entity?: { id?: string; amount?: number; currency?: string; status?: string } };
          }
        | undefined;

      const entity =
        pl?.payment_link?.entity ||
        (body.payload as { payment_link?: { entity?: Record<string, unknown> } })?.payment_link?.entity;
      if (!entity || typeof entity !== "object") return null;

      const id = String((entity as { id?: string }).id || "");
      const amount = Number((entity as { amount?: number }).amount || 0);
      const currency = String((entity as { currency?: string }).currency || "INR").toUpperCase();
      const notes = (entity as { notes?: Record<string, string> }).notes || {};

      let status: WebhookPayload["status"] = "pending";
      if (event === "payment_link.paid") status = "completed";
      else if (event === "payment_link.expired" || event === "payment_link.cancelled") status = "cancelled";
      else if (event === "payment_link.partially_paid") status = "processing";
      else return null;

      return {
        transactionId: id,
        orderId: String(notes.transactionId || notes.orderId || id),
        status,
        amount,
        currency,
        metadata: notes as Record<string, unknown>,
        webhookEventId: String(body.id || ""),
      };
    } catch {
      return null;
    }
  }

  async refund(request: RefundRequest): Promise<RefundResponse> {
    if (request.gatewayTransactionId.startsWith("plink_")) {
      return {
        success: false,
        error: "Razorpay refunds require a payment id (capture), not a payment link id",
      };
    }
    try {
      const re = await this.client.payments.refund(request.gatewayTransactionId, {
        amount: request.amount > 0 ? request.amount : undefined,
        ...(request.reason ? { notes: { reason: request.reason } } : {}),
      });
      const id = (re as { id?: string }).id;
      return { success: true, refundId: id ?? undefined };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : "Razorpay refund failed" };
    }
  }
}

export function verifyRazorpayWebhookSignature(
  rawBody: string,
  signature: string,
  webhookSecret: string
): boolean {
  if (!webhookSecret || !signature) return false;
  const expected = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
