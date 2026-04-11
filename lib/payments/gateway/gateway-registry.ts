import { env } from "@/env";
import { db } from "@/lib/db/client";
import { gatewayCredentials } from "@/lib/db/schema";
import type { BaseGateway } from "./adapters/base-gateway";
import type { GatewayConfig } from "./adapters/base-gateway";
import { CCBillAdapter } from "./adapters/ccbill-adapter";
import { DodoPaymentsAdapter } from "./adapters/dodo-adapter";
import { EpochAdapter } from "./adapters/epoch-adapter";
import { MockGateway } from "./adapters/mock-gateway";
import { PayPalAdapter } from "./adapters/paypal-adapter";
import { PaytmAdapter } from "./adapters/paytm-adapter";
import { RazorpayAdapter } from "./adapters/razorpay-adapter";
import { SegPayAdapter } from "./adapters/segpay-adapter";
import { StripeAdapter } from "./adapters/stripe-adapter";

export type KnownGatewayName =
  | "stripe"
  | "razorpay"
  | "paytm"
  | "paypal"
  | "dodo"
  | "mock"
  | "ccbill"
  | "epoch"
  | "segpay";

function modeFromEnv(): "live" | "test" {
  return env.PAYMENT_GATEWAY_MODE === "live" ? "live" : "test";
}

function mergeConfigFromRow(
  name: KnownGatewayName,
  row: typeof gatewayCredentials.$inferSelect | undefined
): GatewayConfig | null {
  const mode = (row?.mode === "live" || row?.mode === "test" ? row.mode : modeFromEnv()) as "live" | "test";
  const creds = (row?.credentials as Record<string, unknown>) || {};

  switch (name) {
    case "stripe": {
      const secretKey = (creds.secretKey as string) || env.STRIPE_SECRET_KEY;
      if (!secretKey) return null;
      return {
        secretKey,
        webhookSecret: row?.webhookSecret || env.STRIPE_WEBHOOK_SECRET,
        mode,
        additionalConfig: creds,
      };
    }
    case "razorpay": {
      const keyId = (creds.keyId as string) || env.RAZORPAY_KEY_ID;
      const keySecret = (creds.keySecret as string) || env.RAZORPAY_KEY_SECRET;
      if (!keyId || !keySecret) return null;
      return {
        apiKey: keyId,
        secretKey: keySecret,
        webhookSecret: row?.webhookSecret || env.RAZORPAY_WEBHOOK_SECRET,
        mode,
        additionalConfig: creds,
      };
    }
    case "paytm": {
      const mid = (creds.mid as string) || env.PAYTM_MID;
      const merchantKey = (creds.merchantKey as string) || env.PAYTM_MERCHANT_KEY;
      const website = (creds.website as string) || env.PAYTM_WEBSITE;
      if (!mid || !merchantKey) return null;
      return {
        merchantId: mid,
        secretKey: merchantKey,
        mode,
        additionalConfig: { website: website || "DEFAULT", ...creds },
      };
    }
    case "paypal": {
      const clientId = (creds.clientId as string) || env.PAYPAL_CLIENT_ID;
      const clientSecret = (creds.clientSecret as string) || env.PAYPAL_CLIENT_SECRET;
      if (!clientId || !clientSecret) return null;
      const paypalMode = (creds.paypalMode as string) || env.PAYPAL_MODE;
      return {
        apiKey: clientId,
        secretKey: clientSecret,
        webhookSecret: row?.webhookSecret || env.PAYPAL_WEBHOOK_ID,
        mode: paypalMode === "live" ? "live" : "test",
        additionalConfig: creds,
      };
    }
    case "dodo": {
      const apiKey = (creds.apiKey as string) || env.DODO_API_KEY;
      if (!apiKey) return null;
      return {
        secretKey: apiKey,
        webhookSecret: row?.webhookSecret || env.DODO_WEBHOOK_SECRET,
        mode,
        additionalConfig: {
          apiBaseUrl: creds.apiBaseUrl as string | undefined,
        },
      };
    }
    case "mock":
      return { mode: "test", additionalConfig: {} };
    case "ccbill":
      return {
        apiKey: env.PAYMENT_GATEWAY_API_KEY,
        secretKey: env.PAYMENT_GATEWAY_SECRET_KEY,
        merchantId: env.PAYMENT_GATEWAY_MERCHANT_ID,
        mode,
        additionalConfig: creds,
      };
    case "epoch":
    case "segpay":
      return {
        apiKey: env.PAYMENT_GATEWAY_API_KEY,
        secretKey: env.PAYMENT_GATEWAY_SECRET_KEY,
        mode,
        additionalConfig: creds,
      };
    default:
      return null;
  }
}

function instantiate(name: KnownGatewayName, config: GatewayConfig): BaseGateway {
  switch (name) {
    case "stripe":
      return new StripeAdapter(config);
    case "razorpay":
      return new RazorpayAdapter(config);
    case "paytm":
      return new PaytmAdapter(config);
    case "paypal":
      return new PayPalAdapter(config);
    case "dodo":
      return new DodoPaymentsAdapter(config);
    case "mock":
      return new MockGateway(config);
    case "ccbill":
      return new CCBillAdapter(config);
    case "epoch":
      return new EpochAdapter(config);
    case "segpay":
      return new SegPayAdapter(config);
    default:
      throw new Error(`Unknown gateway: ${name}`);
  }
}

export class GatewayRegistry {
  static isConfigured(name: string): boolean {
    const n = name as KnownGatewayName;
    switch (n) {
      case "stripe":
        return !!env.STRIPE_SECRET_KEY;
      case "razorpay":
        return !!env.RAZORPAY_KEY_ID && !!env.RAZORPAY_KEY_SECRET;
      case "paytm":
        return !!env.PAYTM_MID && !!env.PAYTM_MERCHANT_KEY;
      case "paypal":
        return !!env.PAYPAL_CLIENT_ID && !!env.PAYPAL_CLIENT_SECRET;
      case "dodo":
        return !!env.DODO_API_KEY;
      case "mock":
        return true;
      default:
        return false;
    }
  }

  static async getGateway(name: string): Promise<BaseGateway | null> {
    const n = name as KnownGatewayName;
    const row = await db.query.gatewayCredentials.findFirst({
      where: (g, { eq: eqOp }) => eqOp(g.gatewayName, name),
    });
    const activeRow = row?.isActive ? row : undefined;
    let config = mergeConfigFromRow(n, activeRow);
    if (!config) {
      config = mergeConfigFromRow(n, undefined);
    }
    if (!config) return null;
    return instantiate(n, config);
  }

  /** Synchronous path for legacy factory (single gateway). */
  static getGatewaySyncFromEnv(name: KnownGatewayName): BaseGateway | null {
    const config = mergeConfigFromRow(name, undefined);
    if (!config) return null;
    return instantiate(name, config);
  }
}
