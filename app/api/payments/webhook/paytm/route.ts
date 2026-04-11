import { NextResponse } from "next/server";
import { or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { env } from "@/env";
import { PaytmAdapter } from "@/lib/payments/gateway/adapters/paytm-adapter";
import { PaymentService } from "@/lib/payments/payment-service";

export async function POST(request: Request) {
  try {
    const ct = request.headers.get("content-type") || "";
    let payload: Record<string, unknown>;
    if (ct.includes("application/json")) {
      payload = (await request.json()) as Record<string, unknown>;
    } else {
      const form = await request.formData();
      payload = Object.fromEntries(form.entries()) as Record<string, unknown>;
    }

    const adapter = new PaytmAdapter({
      merchantId: env.PAYTM_MID,
      secretKey: env.PAYTM_MERCHANT_KEY,
      mode: env.PAYMENT_GATEWAY_MODE,
      additionalConfig: { website: env.PAYTM_WEBSITE || "DEFAULT" },
    });

    const parsed = adapter.parseWebhook(payload);
    if (!parsed) {
      return NextResponse.json({ ok: true });
    }

    if (
      parsed.status !== "completed" &&
      parsed.status !== "failed" &&
      parsed.status !== "cancelled"
    ) {
      return NextResponse.json({ ok: true });
    }

    const internalId = parsed.orderId;
    const transaction = await db.query.paymentTransaction.findFirst({
      where: (pt, { eq: eqOp, or: orOp }) =>
        orOp(eqOp(pt.id, internalId), eqOp(pt.gatewayTransactionId, parsed.transactionId)),
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    await PaymentService.processPaymentCompletion(transaction.id, parsed.status, {
      webhookEventId: parsed.webhookEventId,
    });

    return new NextResponse("OK", { status: 200 });
  } catch (e) {
    console.error("Paytm webhook error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
