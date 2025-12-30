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

    const now = new Date();
    const isCreator = order.creatorId === session.user.id;

    // Update join timestamp
    if (isCreator) {
      await db
        .update(serviceOrder)
        .set({
          creatorJoinedAt: now,
          updatedAt: now,
        })
        .where(eq(serviceOrder.id, orderId));
    } else {
      await db
        .update(serviceOrder)
        .set({
          customerJoinedAt: now,
          updatedAt: now,
        })
        .where(eq(serviceOrder.id, orderId));
    }

    return NextResponse.json({
      success: true,
      joinedAt: now.toISOString(),
      role: isCreator ? "creator" : "fan",
    });
  } catch (error) {
    console.error("Error tracking join:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

