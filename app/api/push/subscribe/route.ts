import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { pushSubscription, notificationPreference } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

interface SubscribeRequest {
  token: string; // FCM token
  userAgent?: string;
}

// POST - Register push subscription
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body: SubscribeRequest = await request.json();
    const { token, userAgent } = body;

    if (!token) {
      return NextResponse.json(
        { error: "FCM token is required" },
        { status: 400 }
      );
    }

    // Check if subscription already exists
    const existing = await db.query.pushSubscription.findFirst({
      where: (ps, { eq: eqOp }) => eqOp(ps.endpoint, token),
    });

    if (existing) {
      // Update existing subscription
      await db
        .update(pushSubscription)
        .set({
          userId: session.user.id,
          userAgent: userAgent || request.headers.get("user-agent") || null,
          updatedAt: new Date(),
        })
        .where(eq(pushSubscription.id, existing.id));
    } else {
      // Create new subscription
      // Note: endpoint stores the FCM token, p256dh and auth are not needed for FCM
      await db.insert(pushSubscription).values({
        userId: session.user.id,
        endpoint: token, // Store FCM token in endpoint field
        p256dh: "", // Not needed for FCM
        auth: "", // Not needed for FCM
        userAgent: userAgent || request.headers.get("user-agent") || null,
      });
    }

    // Enable notification preference when subscribing
    const existingPreference = await db.query.notificationPreference.findFirst({
      where: (np, { eq: eqOp }) => eqOp(np.userId, session.user.id),
    });

    if (existingPreference) {
      // Update existing preference to enabled
      await db
        .update(notificationPreference)
        .set({
          enabled: true,
          updatedAt: new Date(),
        })
        .where(eq(notificationPreference.id, existingPreference.id));
    } else {
      // Create new preference with enabled = true
      await db.insert(notificationPreference).values({
        userId: session.user.id,
        enabled: true,
      });
    }

    return NextResponse.json({
      success: true,
      message: existing ? "Subscription updated" : "Subscription registered",
    });
  } catch (error) {
    console.error("Error registering push subscription:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

