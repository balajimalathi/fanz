import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { serviceOrder } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { isUserOnline } from "@/lib/livekit/presence";

export async function GET(
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

    // Verify user is part of this order
    if (order.creatorId !== session.user.id && order.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // Check online status of both parties
    const [creatorOnline, fanOnline] = await Promise.all([
      isUserOnline(order.creatorId),
      isUserOnline(order.userId),
    ]);

    return NextResponse.json({
      creator: creatorOnline,
      fan: fanOnline,
      bothOnline: creatorOnline && fanOnline,
    });
  } catch (error) {
    console.error("Error checking online status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

