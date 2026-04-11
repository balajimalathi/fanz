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

type PayPalTokenResponse = { access_token: string };

type PayPalOrderResponse = {
  id: string;
  status: string;
  links?: { href: string; rel: string; method: string }[];
};

export class PayPalAdapter extends BaseGateway {
  private baseUrl: string;

  constructor(config: GatewayConfig) {
    super(config);
    const live = config.mode === "live";
    this.baseUrl = live ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
  }

  getName(): string {
    return "paypal";
  }

  getSupportedCurrencies(): string[] {
    return ["USD", "EUR", "GBP", "INR", "CAD", "AUD"];
  }

  private async getAccessToken(): Promise<string> {
    const id = this.config.apiKey;
    const secret = this.config.secretKey;
    if (!id || !secret) throw new Error("PayPal client id and secret are required");
    const auth = Buffer.from(`${id}:${secret}`).toString("base64");
    const res = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`PayPal token failed: ${res.status} ${t}`);
    }
    const data = (await res.json()) as PayPalTokenResponse;
    return data.access_token;
  }

  async initiatePayment(request: PaymentInitiationRequest): Promise<PaymentInitiationResponse> {
    try {
      const token = await this.getAccessToken();
      const currency = request.currency.toUpperCase();
      const internalTxId = String(request.metadata?.transactionId || "");

      const body = {
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: internalTxId || request.orderId,
            custom_id: request.orderId,
            amount: {
              currency_code: currency,
              value: (request.amount / 100).toFixed(2),
            },
          },
        ],
        application_context: {
          return_url: `${request.returnUrl}${request.returnUrl.includes("?") ? "&" : "?"}status=completed`,
          cancel_url: `${request.returnUrl}${request.returnUrl.includes("?") ? "&" : "?"}status=cancelled`,
          brand_name: "Payment",
          user_action: "PAY_NOW",
        },
      };

      const res = await fetch(`${this.baseUrl}/v2/checkout/orders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const t = await res.text();
        return { success: false, error: `PayPal order failed: ${res.status} ${t}` };
      }

      const order = (await res.json()) as PayPalOrderResponse;
      const approve = order.links?.find((l) => l.rel === "approve")?.href;
      if (!approve) {
        return { success: false, error: "PayPal did not return approve URL" };
      }

      return {
        success: true,
        paymentUrl: approve,
        transactionId: order.id,
      };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : "PayPal initiate failed" };
    }
  }

  /** Call after buyer returns from PayPal with an approved order (token in query). */
  async captureApprovedOrder(orderId: string): Promise<PaymentStatusResponse> {
    try {
      const token = await this.getAccessToken();
      const res = await fetch(`${this.baseUrl}/v2/checkout/orders/${orderId}/capture`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) {
        return {
          success: false,
          status: "failed",
          error: await res.text(),
        };
      }
      const order = (await res.json()) as PayPalOrderResponse & {
        purchase_units?: {
          payments?: {
            captures?: { amount?: { value: string; currency_code: string } }[];
          };
        }[];
      };
      const capture = order.purchase_units?.[0]?.payments?.captures?.[0];
      const amount = capture?.amount?.value
        ? Math.round(parseFloat(capture.amount.value) * 100)
        : undefined;
      const currency = capture?.amount?.currency_code?.toUpperCase() || "USD";
      return {
        success: order.status === "COMPLETED",
        status: order.status === "COMPLETED" ? "completed" : "failed",
        transactionId: orderId,
        amount,
        currency,
      };
    } catch (e) {
      return {
        success: false,
        status: "failed",
        error: e instanceof Error ? e.message : "PayPal capture failed",
      };
    }
  }

  async checkPaymentStatus(orderId: string): Promise<PaymentStatusResponse> {
    try {
      const token = await this.getAccessToken();
      const res = await fetch(`${this.baseUrl}/v2/checkout/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        return { success: false, status: "failed", error: await res.text() };
      }
      const order = (await res.json()) as PayPalOrderResponse & {
        purchase_units?: {
          payments?: {
            captures?: { amount?: { value: string; currency_code: string } }[];
          };
        }[];
      };
      let status: PaymentStatusResponse["status"] = "pending";
      if (order.status === "COMPLETED") status = "completed";
      else if (order.status === "VOIDED" || order.status === "CANCELLED") status = "cancelled";
      else if (order.status === "CREATED" || order.status === "SAVED" || order.status === "APPROVED")
        status = "processing";

      const capture = order.purchase_units?.[0]?.payments?.captures?.[0];
      const amount = capture?.amount?.value
        ? Math.round(parseFloat(capture.amount.value) * 100)
        : undefined;
      const currency = capture?.amount?.currency_code?.toUpperCase() || "USD";

      return {
        success: true,
        status,
        transactionId: orderId,
        amount,
        currency,
      };
    } catch (e) {
      return {
        success: false,
        status: "failed",
        error: e instanceof Error ? e.message : "PayPal status failed",
      };
    }
  }

  verifyWebhook(_payload: WebhookPayload, _signature: string): boolean {
    return true;
  }

  parseWebhook(payload: unknown): WebhookPayload | null {
    try {
      const body = payload as {
        event_type?: string;
        resource?: {
          id?: string;
          supplementary_data?: { related_ids?: { order_id?: string } };
          amount?: { value?: string; currency_code?: string };
          custom_id?: string;
        };
      };
      const type = body.event_type || "";
      const res = body.resource;
      if (!res) return null;

      const orderId = res.supplementary_data?.related_ids?.order_id || res.id || "";
      let status: WebhookPayload["status"] = "pending";
      if (type === "CHECKOUT.ORDER.APPROVED") status = "processing";
      if (type === "PAYMENT.CAPTURE.COMPLETED") status = "completed";
      if (type === "PAYMENT.CAPTURE.DENIED" || type === "CHECKOUT.ORDER.CANCELLED") status = "failed";

      const amount = res.amount?.value ? Math.round(parseFloat(res.amount.value) * 100) : 0;
      const currency = (res.amount?.currency_code || "USD").toUpperCase();

      return {
        transactionId: res.id || orderId,
        orderId: res.custom_id || orderId,
        status,
        amount,
        currency,
        webhookEventId: (payload as { id?: string }).id,
      };
    } catch {
      return null;
    }
  }

  async refund(request: RefundRequest): Promise<RefundResponse> {
    try {
      const token = await this.getAccessToken();
      const res = await fetch(`${this.baseUrl}/v2/payments/captures/${request.gatewayTransactionId}/refund`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: {
            value: (request.amount / 100).toFixed(2),
            currency_code: request.currency.toUpperCase(),
          },
        }),
      });
      if (!res.ok) {
        return { success: false, error: await res.text() };
      }
      const data = (await res.json()) as { id?: string };
      return { success: true, refundId: data.id };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : "PayPal refund failed" };
    }
  }
}
