import { NextResponse } from "next/server";
import { or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { paymentTransaction } from "@/lib/db/schema";
import { env } from "@/env";
import { RazorpayAdapter, verifyRazorpayWebhookSignature } from "@/lib/payments/gateway/adapters/razorpay-adapter";
import { PaymentService } from "@/lib/payments/payment-service";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature") || "";
    const secret = env.RAZORPAY_WEBHOOK_SECRET;
    const keyId = env.RAZORPAY_KEY_ID;
    const keySecret = env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret || !secret || !verifyRazorpayWebhookSignature(rawBody, signature, secret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const body = JSON.parse(rawBody) as Record<string, unknown>;
    const adapter = new RazorpayAdapter({
      apiKey: keyId,
      secretKey: keySecret,
      webhookSecret: secret,
      mode: env.PAYMENT_GATEWAY_MODE,
    });
    const payload = adapter.parseWebhook(body);
    if (!payload) {
      return NextResponse.json({ ok: true });
    }

    const internalId = payload.orderId;
    const transaction = await db.query.paymentTransaction.findFirst({
      where: (pt, { eq: eqOp, or: orOp }) =>
        orOp(eqOp(pt.id, internalId), eqOp(pt.gatewayTransactionId, payload.transactionId)),
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    if (payload.status !== "completed" && payload.status !== "failed" && payload.status !== "cancelled") {
      return NextResponse.json({ ok: true });
    }

    const payStatus = payload.status;

    await PaymentService.processPaymentCompletion(transaction.id, payStatus, {
      webhookEventId: payload.webhookEventId,
    });

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("Razorpay webhook error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
