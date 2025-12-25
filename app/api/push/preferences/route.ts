import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { notificationPreference } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

interface UpdatePreferencesRequest {
  enabled: boolean;
}

// GET - Get notification preferences
export async function GET(request: NextRequest) {
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

    const preference = await db.query.notificationPreference.findFirst({
      where: (np, { eq: eqOp }) => eqOp(np.userId, session.user.id),
    });

    // Default to enabled if no preference exists
    return NextResponse.json({
      enabled: preference?.enabled ?? true,
    });
  } catch (error) {
    console.error("Error fetching notification preferences:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Update notification preferences
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

    const body: UpdatePreferencesRequest = await request.json();
    const { enabled } = body;

    if (typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "enabled must be a boolean" },
        { status: 400 }
      );
    }

    // Check if preference exists
    const existing = await db.query.notificationPreference.findFirst({
      where: (np, { eq: eqOp }) => eqOp(np.userId, session.user.id),
    });

    if (existing) {
      // Update existing preference
      await db
        .update(notificationPreference)
        .set({
          enabled,
          updatedAt: new Date(),
        })
        .where(eq(notificationPreference.id, existing.id));
    } else {
      // Create new preference
      await db.insert(notificationPreference).values({
        userId: session.user.id,
        enabled,
      });
    }

    return NextResponse.json({
      success: true,
      enabled,
    });
  } catch (error) {
    console.error("Error updating notification preferences:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

