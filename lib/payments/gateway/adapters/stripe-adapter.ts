import Stripe from "stripe";
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

function mapStripeStatus(
  s: Stripe.Checkout.Session.PaymentStatus | Stripe.PaymentIntent.Status | null | undefined
): PaymentStatusResponse["status"] {
  if (s === "paid" || s === "succeeded") return "completed";
  if (s === "unpaid" || s === "requires_payment_method") return "pending";
  if (s === "canceled") return "cancelled";
  if (s === "processing" || s === "requires_capture" || s === "requires_confirmation" || s === "requires_action")
    return "processing";
  return "failed";
}

export class StripeAdapter extends BaseGateway {
  private stripe: Stripe;

  constructor(config: GatewayConfig) {
    super(config);
    const key = config.secretKey || config.apiKey;
    if (!key) {
      throw new Error("Stripe secret key is required");
    }
    this.stripe = new Stripe(key);
  }

  getName(): string {
    return "stripe";
  }

  getSupportedCurrencies(): string[] {
    return ["INR", "USD", "EUR", "GBP", "AUD", "CAD", "SGD", "AED", "JPY"];
  }

  supportsDirectPayout(): boolean {
    return true;
  }

  async initiatePayment(request: PaymentInitiationRequest): Promise<PaymentInitiationResponse> {
    try {
      const currency = request.currency.toLowerCase();
      const internalTxId = String(request.metadata?.transactionId || "");
      const connectedAccountId =
        (request.metadata?.stripeConnectedAccountId as string | undefined) ||
        (request.metadata?.stripe_connect_account_id as string | undefined);

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency,
              unit_amount: request.amount,
              product_data: { name: `Order ${request.orderId}` },
            },
            quantity: 1,
          },
        ],
        success_url: `${request.returnUrl}${request.returnUrl.includes("?") ? "&" : "?"}gatewayTransactionId={CHECKOUT_SESSION_ID}&status=completed`,
        cancel_url: `${request.returnUrl}${request.returnUrl.includes("?") ? "&" : "?"}status=cancelled`,
        client_reference_id: internalTxId || request.orderId,
        metadata: {
          orderId: request.orderId,
          transactionId: internalTxId,
          userId: request.customerId,
        },
      };

      if (connectedAccountId) {
        sessionParams.payment_intent_data = {
          transfer_data: { destination: connectedAccountId },
        };
      }

      const session = await this.stripe.checkout.sessions.create(sessionParams, {
        idempotencyKey: request.idempotencyKey,
      });

      if (!session.url) {
        return { success: false, error: "Stripe did not return checkout URL" };
      }

      return {
        success: true,
        paymentUrl: session.url,
        transactionId: session.id,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Stripe initiate failed";
      return { success: false, error: msg };
    }
  }

  async checkPaymentStatus(checkoutSessionId: string): Promise<PaymentStatusResponse> {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(checkoutSessionId, {
        expand: ["payment_intent"],
      });
      const pi = session.payment_intent as Stripe.PaymentIntent | null;
      const status = mapStripeStatus(session.payment_status || pi?.status);
      return {
        success: true,
        status,
        transactionId: checkoutSessionId,
        amount: session.amount_total ?? requestAmountFromPi(pi),
        currency: (session.currency || "inr").toUpperCase(),
      };
    } catch (e) {
      return {
        success: false,
        status: "failed",
        error: e instanceof Error ? e.message : "Stripe status check failed",
      };
    }
  }

  verifyWebhook(_payload: WebhookPayload, _signature: string): boolean {
    // Stripe verification uses raw body; handled in API route via constructEvent
    return true;
  }

  parseWebhook(payload: unknown): WebhookPayload | null {
    try {
      const event = payload as Stripe.Event;
      if (!event || typeof event !== "object" || !("type" in event)) return null;

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const amount = session.amount_total ?? 0;
        const currency = (session.currency || "inr").toUpperCase();
        const internalId =
          (session.metadata?.transactionId as string) ||
          (session.client_reference_id as string) ||
          session.id;
        return {
          transactionId: session.id,
          orderId: internalId,
          status: session.payment_status === "paid" ? "completed" : "processing",
          amount,
          currency,
          metadata: session.metadata as Record<string, unknown>,
          webhookEventId: event.id,
        };
      }

      if (event.type === "checkout.session.async_payment_failed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const internalId =
          (session.metadata?.transactionId as string) ||
          (session.client_reference_id as string) ||
          session.id;
        return {
          transactionId: session.id,
          orderId: internalId,
          status: "failed",
          amount: session.amount_total ?? 0,
          currency: (session.currency || "inr").toUpperCase(),
          webhookEventId: event.id,
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  async refund(request: RefundRequest): Promise<RefundResponse> {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(request.gatewayTransactionId, {
        expand: ["payment_intent"],
      });
      const pi = session.payment_intent as Stripe.PaymentIntent | null;
      if (!pi || typeof pi === "string") {
        return { success: false, error: "No payment intent for refund" };
      }
      const re = await this.stripe.refunds.create({
        payment_intent: pi.id,
        amount: request.amount > 0 ? request.amount : undefined,
        reason: request.reason ? "requested_by_customer" : undefined,
      });
      return { success: true, refundId: re.id };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : "Refund failed" };
    }
  }
}

function requestAmountFromPi(pi: Stripe.PaymentIntent | null): number | undefined {
  return pi?.amount ?? undefined;
}

/** Verify using explicit API key + webhook signing secret. */
export function verifyStripeWebhookWithSecret(
  rawBody: string | Buffer,
  signature: string,
  webhookSecret: string,
  apiSecretKey: string
): Stripe.Event | null {
  try {
    const stripe = new Stripe(apiSecretKey);
    return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return null;
  }
}
