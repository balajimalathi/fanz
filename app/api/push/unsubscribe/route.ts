import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { pushSubscription } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

interface UnsubscribeRequest {
  token?: string; // FCM token (optional - if not provided, removes all for user)
}

// POST - Remove push subscription
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

    const body: UnsubscribeRequest = await request.json();
    const { token } = body;

    if (token) {
      // Remove specific subscription
      await db
        .delete(pushSubscription)
        .where(
          and(
            eq(pushSubscription.userId, session.user.id),
            eq(pushSubscription.endpoint, token)
          )
        );
    } else {
      // Remove all subscriptions for this user
      await db
        .delete(pushSubscription)
        .where(eq(pushSubscription.userId, session.user.id));
    }

    return NextResponse.json({
      success: true,
      message: "Subscription removed",
    });
  } catch (error) {
    console.error("Error removing push subscription:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

