import { NextResponse } from "next/server";
import { eq, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { env } from "@/env";
import { PayPalAdapter } from "@/lib/payments/gateway/adapters/paypal-adapter";
import { PaymentService } from "@/lib/payments/payment-service";

/** PayPal webhooks: verify in production via PayPal signature API; here we parse trusted dashboard events. */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const adapter = new PayPalAdapter({
      apiKey: env.PAYPAL_CLIENT_ID || "",
      secretKey: env.PAYPAL_CLIENT_SECRET || "",
      mode: env.PAYPAL_MODE === "live" ? "live" : "test",
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
    console.error("PayPal webhook error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
