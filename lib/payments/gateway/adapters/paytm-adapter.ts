// eslint-disable-next-line @typescript-eslint/no-require-imports
const PaytmChecksum = require("paytmchecksum") as {
  generateSignature: (json: string, key: string) => Promise<string>;
  verifySignature: (json: string, key: string, checksum: string) => Promise<boolean>;
};
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

function paytmHost(mode: "live" | "test"): string {
  return mode === "live" ? "https://securegw.paytm.in" : "https://securegw-stage.paytm.in";
}

export class PaytmAdapter extends BaseGateway {
  constructor(config: GatewayConfig) {
    super(config);
  }

  getName(): string {
    return "paytm";
  }

  getSupportedCurrencies(): string[] {
    return ["INR"];
  }

  private getMid(): string {
    return this.config.merchantId || this.config.apiKey || "";
  }

  private getMerchantKey(): string {
    return this.config.secretKey || "";
  }

  private getWebsite(): string {
    return (this.config.additionalConfig?.website as string) || "DEFAULT";
  }

  async initiatePayment(request: PaymentInitiationRequest): Promise<PaymentInitiationResponse> {
    const mid = this.getMid();
    const merchantKey = this.getMerchantKey();
    if (!mid || !merchantKey) {
      return { success: false, error: "Paytm MID and merchant key are required" };
    }

    const host = paytmHost(this.config.mode);
    const orderId = request.orderId.slice(0, 30).replace(/[^a-zA-Z0-9_-]/g, "");
    const value = (request.amount / 100).toFixed(2);

    const body = {
      requestType: "Payment",
      mid,
      websiteName: this.getWebsite(),
      orderId,
      callbackUrl: request.webhookUrl || request.returnUrl,
      txnAmount: { value, currency: "INR" },
      userInfo: { custId: request.customerId.slice(0, 50) },
    };

    try {
      const checksum = await PaytmChecksum.generateSignature(JSON.stringify(body), merchantKey);
      const payload = {
        body,
        head: { signature: checksum },
      };

      const url = `${host}/theia/api/v1/initiateTransaction?mid=${encodeURIComponent(mid)}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as {
        body?: { resultInfo?: { resultStatus?: string; resultMsg?: string }; txnToken?: string };
      };
      const resultStatus = data.body?.resultInfo?.resultStatus;
      const txnToken = data.body?.txnToken;
      if (!res.ok || resultStatus !== "S" || !txnToken) {
        const msg = data.body?.resultInfo?.resultMsg || `Paytm initiate failed (${res.status})`;
        return { success: false, error: msg };
      }

      const payUrl = `${host}/theia/api/v1/showPaymentPage?mid=${encodeURIComponent(mid)}&orderId=${encodeURIComponent(orderId)}&txnToken=${encodeURIComponent(txnToken)}`;

      return {
        success: true,
        paymentUrl: payUrl,
        transactionId: orderId,
      };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : "Paytm initiate failed" };
    }
  }

  async checkPaymentStatus(orderId: string): Promise<PaymentStatusResponse> {
    const mid = this.getMid();
    const merchantKey = this.getMerchantKey();
    if (!mid || !merchantKey) {
      return { success: false, status: "failed", error: "Paytm not configured" };
    }
    const host = paytmHost(this.config.mode);
    const body = {
      mid,
      orderId,
    };
    try {
      const checksum = await PaytmChecksum.generateSignature(JSON.stringify(body), merchantKey);
      const res = await fetch(`${host}/v3/order/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, head: { signature: checksum } }),
      });
      const data = (await res.json()) as {
        body?: {
          resultInfo?: { resultStatus?: string; resultMsg?: string };
          txnAmount?: string;
        };
      };
      const statusCode = data.body?.resultInfo?.resultStatus;
      let status: PaymentStatusResponse["status"] = "pending";
      if (statusCode === "01") status = "completed";
      else if (statusCode === "141" || statusCode === "334") status = "failed";
      else if (statusCode === "039") status = "cancelled";

      const amount = data.body?.txnAmount ? Math.round(parseFloat(data.body.txnAmount) * 100) : undefined;

      return {
        success: true,
        status,
        transactionId: orderId,
        amount,
        currency: "INR",
      };
    } catch (e) {
      return {
        success: false,
        status: "failed",
        error: e instanceof Error ? e.message : "Paytm status failed",
      };
    }
  }

  verifyWebhook(_payload: WebhookPayload, _signature: string): boolean {
    return true;
  }

  parseWebhook(payload: unknown): WebhookPayload | null {
    try {
      const p = payload as Record<string, unknown>;
      const body = (p.body as Record<string, unknown>) || p;
      const orderId = String(body.ORDERID || body.orderId || "");
      const status = String(body.STATUS || body.status || "");
      const txnAmount = String(body.TXNAMOUNT || body.txnAmount || "0");
      let st: WebhookPayload["status"] = "pending";
      if (status === "TXN_SUCCESS") st = "completed";
      else if (status === "TXN_FAILURE") st = "failed";
      else if (status === "CANCELLED") st = "cancelled";
      return {
        transactionId: String(body.TXNID || body.txnId || orderId),
        orderId,
        status: st,
        amount: Math.round(parseFloat(txnAmount) * 100) || 0,
        currency: "INR",
        metadata: body as Record<string, unknown>,
      };
    } catch {
      return null;
    }
  }

  async refund(request: RefundRequest): Promise<RefundResponse> {
    return { success: false, error: "Paytm refunds not implemented in adapter" };
  }
}
