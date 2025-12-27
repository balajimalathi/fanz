import { env } from "@/env";
import { BaseGateway } from "./adapters/base-gateway";
import { MockGateway } from "./adapters/mock-gateway";
import { PaytmAdapter } from "./adapters/paytm-adapter";
import { CCBillAdapter } from "./adapters/ccbill-adapter";
import { EpochAdapter } from "./adapters/epoch-adapter";
import { SegPayAdapter } from "./adapters/segpay-adapter";

/**
 * Factory to create payment gateway adapter based on environment configuration
 */
export function createGateway(): BaseGateway {
  const mode = env.PAYMENT_GATEWAY_MODE || "test";
  const gatewayType = env.PAYMENT_GATEWAY_TYPE;

  const config = {
    apiKey: env.PAYMENT_GATEWAY_API_KEY,
    secretKey: env.PAYMENT_GATEWAY_SECRET_KEY,
    merchantId: env.PAYMENT_GATEWAY_MERCHANT_ID,
    webhookSecret: env.PAYMENT_GATEWAY_WEBHOOK_SECRET,
    mode: mode as "live" | "test",
  };

  // In test mode, always use mock gateway
  if (mode === "test") {
    return new MockGateway(config);
  }

  // In live mode, use the configured gateway type
  switch (gatewayType) {
    case "paytm":
      return new PaytmAdapter(config);
    case "ccbill":
      return new CCBillAdapter(config);
    case "epoch":
      return new EpochAdapter(config);
    case "segpay":
      return new SegPayAdapter(config);
    default:
      // Fallback to mock if no valid gateway type is configured
      console.warn(
        `Invalid or missing PAYMENT_GATEWAY_TYPE (${gatewayType}), falling back to mock gateway`
      );
      return new MockGateway(config);
  }
}

/**
 * Check if payment gateway is enabled
 */
export function isGatewayEnabled(): boolean {
  return env.PAYMENT_GATEWAY_ENABLED === true;
}

