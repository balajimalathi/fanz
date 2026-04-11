import { NextResponse } from "next/server";
import { eq, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { paymentTransaction } from "@/lib/db/schema";
import { env } from "@/env";
import { StripeAdapter, verifyStripeWebhookWithSecret } from "@/lib/payments/gateway/adapters/stripe-adapter";
import { PaymentService } from "@/lib/payments/payment-service";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("stripe-signature") || "";
    const secret = env.STRIPE_WEBHOOK_SECRET;
    const apiKey = env.STRIPE_SECRET_KEY;
    if (!secret || !apiKey) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
    }

    const event = verifyStripeWebhookWithSecret(rawBody, signature, secret, apiKey);
    if (!event) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const adapter = new StripeAdapter({
      secretKey: apiKey,
      webhookSecret: secret,
      mode: env.PAYMENT_GATEWAY_MODE,
    });
    const payload = adapter.parseWebhook(event);
    if (!payload) {
      return NextResponse.json({ ok: true });
    }

    const internalId = payload.orderId || (payload.metadata?.transactionId as string);
    if (!internalId) {
      return NextResponse.json({ error: "Missing transaction reference" }, { status: 400 });
    }

    const transaction = await db.query.paymentTransaction.findFirst({
      where: (pt, { eq: eqOp, or: orOp }) =>
        orOp(eqOp(pt.id, internalId), eqOp(pt.gatewayTransactionId, payload.transactionId)),
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    if (
      payload.status !== "completed" &&
      payload.status !== "failed" &&
      payload.status !== "cancelled"
    ) {
      return NextResponse.json({ ok: true });
    }

    await PaymentService.processPaymentCompletion(transaction.id, payload.status, {
      webhookEventId: payload.webhookEventId,
    });

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("Stripe webhook error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
