import { NextRequest, NextResponse } from "next/server";
import { PaymentService } from "@/lib/payments/payment-service";
import { GatewayService } from "@/lib/payments/gateway/gateway-service";
import { db } from "@/lib/db/client";
import { paymentTransaction } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const signature = request.headers.get("x-signature") || request.headers.get("x-webhook-signature") || "";

    // Process webhook
    const webhookPayload = await GatewayService.processWebhook(body, signature);

    if (!webhookPayload) {
      return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
    }

    // Find transaction by gateway transaction ID or order ID
    let transaction = await db.query.paymentTransaction.findFirst({
      where: (pt, { eq: eqOp, or: orOp }) =>
        orOp(
          eqOp(pt.gatewayTransactionId, webhookPayload.transactionId),
          eqOp(pt.id, webhookPayload.orderId)
        ),
    });

    if (!transaction) {
      console.error(`Transaction not found for webhook: ${webhookPayload.transactionId}`);
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    // Map webhook status to our status
    let paymentStatus: "completed" | "failed" | "cancelled" = "failed";
    if (webhookPayload.status === "completed") {
      paymentStatus = "completed";
    } else if (webhookPayload.status === "cancelled") {
      paymentStatus = "cancelled";
    }

    // Process payment completion
    await PaymentService.processPaymentCompletion(transaction.id, paymentStatus);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

