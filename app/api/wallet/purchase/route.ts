import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { PaymentService } from "@/lib/payments/payment-service";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { planType, creatorId, originUrl } = body;

    if (!planType || !creatorId) {
      return NextResponse.json(
        { error: "Plan type and creator ID are required" },
        { status: 400 }
      );
    }

    // Validate plan type
    if (!["starter", "favorite", "vip"].includes(planType)) {
      return NextResponse.json(
        { error: "Invalid plan type. Must be 'starter', 'favorite', or 'vip'" },
        { status: 400 }
      );
    }

    // Get origin URL from request or use current page
    const currentOriginUrl = originUrl || (typeof window !== "undefined" ? window.location.href : "/");

    // Initiate payment using PaymentService
    // For wallet_credit, entityId is the plan type
    const result = await PaymentService.initiatePayment({
      userId: session.user.id,
      type: "wallet_credit",
      entityId: planType, // Plan type: 'starter', 'favorite', or 'vip'
      creatorId: creatorId, // Creator whose page they were on
      originUrl: currentOriginUrl,
      currency: "INR", // Wallet credits are always in INR
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      transactionId: result.transactionId,
      paymentUrl: result.paymentUrl,
    });
  } catch (error) {
    console.error("Error initiating credit purchase:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
