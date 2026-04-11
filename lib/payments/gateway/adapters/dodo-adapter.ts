import crypto from "node:crypto";
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

function dodoBaseUrl(mode: "live" | "test", override?: string): string {
  if (override) return override.replace(/\/$/, "");
  return mode === "live" ? "https://api.dodopayments.com" : "https://api.test.dodopayments.com";
}

export class DodoPaymentsAdapter extends BaseGateway {
  constructor(config: GatewayConfig) {
    super(config);
  }

  getName(): string {
    return "dodo";
  }

  getSupportedCurrencies(): string[] {
    return ["INR", "USD"];
  }

  private apiKey(): string {
    const k = this.config.secretKey || this.config.apiKey;
    if (!k) throw new Error("Dodo API key is required");
    return k;
  }

  async initiatePayment(request: PaymentInitiationRequest): Promise<PaymentInitiationResponse> {
    const base = dodoBaseUrl(
      this.config.mode,
      this.config.additionalConfig?.apiBaseUrl as string | undefined
    );
    const internalTxId = String(request.metadata?.transactionId || "");

    try {
      const res = await fetch(`${base}/v1/checkouts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: request.amount,
          currency: request.currency.toUpperCase(),
          success_url: request.returnUrl,
          cancel_url: `${request.returnUrl}${request.returnUrl.includes("?") ? "&" : "?"}status=cancelled`,
          metadata: {
            order_id: request.orderId,
            transaction_id: internalTxId,
            user_id: request.customerId,
          },
          customer: {
            email: request.customerEmail,
            name: request.customerName,
          },
        }),
      });

      const text = await res.text();
      let data: Record<string, unknown> = {};
      try {
        data = JSON.parse(text) as Record<string, unknown>;
      } catch {
        return { success: false, error: `Dodo invalid JSON: ${text.slice(0, 200)}` };
      }

      if (!res.ok) {
        return {
          success: false,
          error: String(data.message || data.error || `Dodo HTTP ${res.status}`),
        };
      }

      const url =
        (data.checkout_url as string) ||
        (data.url as string) ||
        (data.payment_url as string) ||
        (data.hosted_page as string);
      const id = String(data.id || data.checkout_id || data.payment_id || "");

      if (!url) {
        return { success: false, error: "Dodo response missing checkout URL (check API version)" };
      }

      return {
        success: true,
        paymentUrl: url,
        transactionId: id || url,
      };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : "Dodo initiate failed" };
    }
  }

  async checkPaymentStatus(checkoutId: string): Promise<PaymentStatusResponse> {
    const base = dodoBaseUrl(
      this.config.mode,
      this.config.additionalConfig?.apiBaseUrl as string | undefined
    );
    try {
      const res = await fetch(`${base}/v1/checkouts/${encodeURIComponent(checkoutId)}`, {
        headers: { Authorization: `Bearer ${this.apiKey()}` },
      });
      const data = (await res.json()) as {
        status?: string;
        amount?: number;
        currency?: string;
      };
      if (!res.ok) {
        return { success: false, status: "failed", error: JSON.stringify(data) };
      }
      let status: PaymentStatusResponse["status"] = "pending";
      const s = (data.status || "").toLowerCase();
      if (s === "completed" || s === "paid" || s === "succeeded") status = "completed";
      else if (s === "failed" || s === "cancelled") status = s === "cancelled" ? "cancelled" : "failed";
      else if (s === "processing" || s === "pending") status = "processing";

      return {
        success: true,
        status,
        transactionId: checkoutId,
        amount: data.amount,
        currency: (data.currency || "INR").toUpperCase(),
      };
    } catch (e) {
      return {
        success: false,
        status: "failed",
        error: e instanceof Error ? e.message : "Dodo status failed",
      };
    }
  }

  verifyWebhook(_payload: WebhookPayload, signature: string): boolean {
    const secret = this.config.webhookSecret || "";
    if (!secret || !signature) return false;
    const expected = crypto.createHmac("sha256", secret).update(JSON.stringify(_payload)).digest("hex");
    try {
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
      return false;
    }
  }

  parseWebhook(payload: unknown): WebhookPayload | null {
    try {
      const p = payload as Record<string, unknown>;
      const id = String(p.id || p.checkout_id || p.payment_id || "");
      const statusRaw = String(p.status || "").toLowerCase();
      let status: WebhookPayload["status"] = "pending";
      if (statusRaw === "completed" || statusRaw === "paid") status = "completed";
      else if (statusRaw === "failed") status = "failed";
      else if (statusRaw === "cancelled") status = "cancelled";
      const amount = Number(p.amount || 0);
      const currency = String(p.currency || "INR").toUpperCase();
      const meta = (p.metadata as Record<string, unknown>) || {};
      return {
        transactionId: id,
        orderId: String(meta.transaction_id || meta.order_id || id),
        status,
        amount,
        currency,
        metadata: meta,
        webhookEventId: String(p.event_id || p.id || ""),
      };
    } catch {
      return null;
    }
  }

  async refund(_request: RefundRequest): Promise<RefundResponse> {
    return { success: false, error: "Dodo refunds not implemented" };
  }
}

export function verifyDodoWebhookHmac(rawBody: string, signature: string, secret: string): boolean {
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}
