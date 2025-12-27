import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { serviceOrder, service } from "@/lib/db/schema";
import { eq, and, inArray, or } from "drizzle-orm";

/**
 * GET - Fetch service orders for followers in inbox
 * Returns service orders grouped by follower ID for display in inbox
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has creator role
    if (session.user.role !== "creator") {
      return NextResponse.json(
        { error: "Forbidden: Creator role required" },
        { status: 403 }
      );
    }

    const creatorId = session.user.id;

    // Get all service orders for this creator with pending or active status
    const orders = await db.query.serviceOrder.findMany({
      where: (so, { eq: eqOp, and: andOp, inArray: inArrayOp }) =>
        andOp(
          eqOp(so.creatorId, creatorId),
          inArrayOp(so.status, ["pending", "active"])
        ),
    });

    // Get service details for all orders
    const serviceIds = orders.map((o) => o.serviceId);
    const services = serviceIds.length > 0
      ? await db.query.service.findMany({
          where: (s, { inArray: inArrayOp }) => inArrayOp(s.id, serviceIds),
        })
      : [];

    const serviceMap = new Map(services.map((s) => [s.id, s]));

    // Group orders by follower (userId) and get the most recent one
    const ordersByFollower = new Map<string, typeof orders[0] & { service?: typeof services[0] }>();

    for (const order of orders) {
      const existing = ordersByFollower.get(order.userId);
      const serviceRecord = serviceMap.get(order.serviceId);

      // Only include chat, audio_call, and video_call services
      if (serviceRecord && 
          (serviceRecord.serviceType === "chat" || 
           serviceRecord.serviceType === "audio_call" || 
           serviceRecord.serviceType === "video_call")) {
        // If no existing order for this follower, or this one is newer, use it
        if (!existing || new Date(order.createdAt) > new Date(existing.createdAt)) {
          ordersByFollower.set(order.userId, { ...order, service: serviceRecord });
        }
      }
    }

    // Transform to array format
    const result = Array.from(ordersByFollower.values()).map((order) => ({
      followerId: order.userId,
      orderId: order.id,
      status: order.status,
      duration: order.service?.duration || null,
      serviceType: order.service?.serviceType || null,
      serviceName: order.service?.name || null,
    }));

    return NextResponse.json({ serviceOrders: result });
  } catch (error) {
    console.error("Error fetching service orders for inbox:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

