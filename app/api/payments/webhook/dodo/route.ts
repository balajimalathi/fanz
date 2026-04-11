import { NextResponse } from "next/server";
import { or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { env } from "@/env";
import { DodoPaymentsAdapter, verifyDodoWebhookHmac } from "@/lib/payments/gateway/adapters/dodo-adapter";
import { PaymentService } from "@/lib/payments/payment-service";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature =
      request.headers.get("x-dodo-signature") ||
      request.headers.get("x-signature") ||
      request.headers.get("dodo-signature") ||
      "";
    const secret = env.DODO_WEBHOOK_SECRET;
    if (!secret || !verifyDodoWebhookHmac(rawBody, signature, secret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const body = JSON.parse(rawBody) as Record<string, unknown>;
    const adapter = new DodoPaymentsAdapter({
      secretKey: env.DODO_API_KEY || "",
      webhookSecret: secret,
      mode: env.PAYMENT_GATEWAY_MODE,
    });
    const payload = adapter.parseWebhook(body);
    if (!payload) {
      return NextResponse.json({ ok: true });
    }

    if (
      payload.status !== "completed" &&
      payload.status !== "failed" &&
      payload.status !== "cancelled"
    ) {
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

    await PaymentService.processPaymentCompletion(transaction.id, payload.status, {
      webhookEventId: payload.webhookEventId,
    });

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("Dodo webhook error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
