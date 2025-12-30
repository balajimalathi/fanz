import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { serviceOrder } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId } = await params;
    const body = await request.json();
    const { fulfillmentNotes } = body;

    // Get service order
    const order = await db.query.serviceOrder.findFirst({
      where: (so, { eq: eqOp }) => eqOp(so.id, orderId),
    });

    if (!order) {
      return NextResponse.json(
        { error: "Service order not found" },
        { status: 404 }
      );
    }

    // Verify user is the creator
    if (order.creatorId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden: Only creator can complete fulfillment" },
        { status: 403 }
      );
    }

    // Verify order is active
    if (order.status !== "active") {
      return NextResponse.json(
        { error: "Service order must be active to complete fulfillment" },
        { status: 400 }
      );
    }

    // Update service order to fulfilled
    await db
      .update(serviceOrder)
      .set({
        status: "fulfilled",
        fulfillmentNotes: fulfillmentNotes || null,
        updatedAt: new Date(),
      })
      .where(eq(serviceOrder.id, orderId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error completing fulfillment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

