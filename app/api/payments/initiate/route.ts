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
    const { type, entityId, returnUrl, duration, originUrl } = body;

    if (!type || !entityId) {
      return NextResponse.json(
        { error: "Type and entityId are required" },
        { status: 400 }
      );
    }

    if (!["membership", "exclusive_post", "service", "live_stream"].includes(type)) {
      return NextResponse.json({ error: "Invalid payment type" }, { status: 400 });
    }

    // Validate duration for membership type
    if (type === "membership" && duration) {
      const validDurations = [1, 3, 6, 12];
      if (!validDurations.includes(duration)) {
        return NextResponse.json(
          { error: "Invalid duration. Must be 1, 3, 6, or 12 months." },
          { status: 400 }
        );
      }
    }

    const result = await PaymentService.initiatePayment({
      userId: session.user.id,
      type: type as "membership" | "exclusive_post" | "service" | "live_stream",
      entityId,
      returnUrl,
      duration,
      originUrl,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      transactionId: result.transactionId,
      paymentUrl: result.paymentUrl,
    });
  } catch (error) {
    console.error("Error initiating payment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

