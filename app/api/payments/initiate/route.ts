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
    const {
      type,
      entityId,
      returnUrl,
      duration,
      originUrl,
      currency,
      customerDescription,
      creatorId,
      metadata,
    } = body;

    if (!type || !entityId) {
      return NextResponse.json(
        { error: "Type and entityId are required" },
        { status: 400 }
      );
    }

    if (!["membership", "exclusive_post", "service", "live_stream", "wallet_credit"].includes(type)) {
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

    // Validate customerDescription for service type
    if (type === "service") {
      if (!customerDescription || typeof customerDescription !== "string") {
        return NextResponse.json(
          { error: "Customer description is required for service orders" },
          { status: 400 }
        );
      }
      const trimmedDescription = customerDescription.trim();
      if (trimmedDescription.length < 10) {
        return NextResponse.json(
          { error: "Description must be at least 10 characters long" },
          { status: 400 }
        );
      }
      if (trimmedDescription.length > 2000) {
        return NextResponse.json(
          { error: "Description must be less than 2000 characters" },
          { status: 400 }
        );
      }
    }

    if (type === "wallet_credit" && (!creatorId || typeof creatorId !== "string")) {
      return NextResponse.json(
        { error: "creatorId is required for wallet credit purchases" },
        { status: 400 }
      );
    }

    const result = await PaymentService.initiatePayment({
      userId: session.user.id,
      type: type as
        | "membership"
        | "exclusive_post"
        | "service"
        | "live_stream"
        | "wallet_credit",
      entityId,
      returnUrl,
      duration,
      originUrl,
      currency,
      customerDescription: type === "service" ? customerDescription : undefined,
      creatorId: type === "wallet_credit" ? creatorId : undefined,
      metadata: metadata && typeof metadata === "object" ? metadata : undefined,
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

