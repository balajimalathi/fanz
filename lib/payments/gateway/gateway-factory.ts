import { env } from "@/env";
import { MockGateway } from "./adapters/mock-gateway";

/**
 * Kill switch: when false, all checkouts use {@link MockGateway} (no PSP calls).
 * When true, {@link PaymentOrchestrator} routes to Stripe / Razorpay / Paytm / PayPal / Dodo using
 * `PAYMENT_GATEWAY_MODE` (test vs live) plus per-PSP env vars and optional `gateway_credentials` rows.
 */
export function areRealPaymentGatewaysEnabled(): boolean {
  return env.PAYMENT_GATEWAY_ENABLED === true;
}

/** In-memory mock checkout (auto-complete when adapter mode is `test`). */
export function createMockGateway(): MockGateway {
  return new MockGateway({
    mode: "test",
    additionalConfig: {},
  });
}
