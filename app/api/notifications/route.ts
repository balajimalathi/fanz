import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { notification } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

// GET - Fetch user notifications
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

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    // Build query
    let notifications = await db
      .select()
      .from(notification)
      .where(eq(notification.userId, session.user.id))
      .orderBy(desc(notification.createdAt))
      .limit(limit);

    if (unreadOnly) {
      notifications = notifications.filter((n) => !n.read);
    }

    // Get unread count
    const unreadNotifications = await db
      .select()
      .from(notification)
      .where(eq(notification.userId, session.user.id));
    
    const unreadCount = unreadNotifications.filter((n) => !n.read).length;

    return NextResponse.json({
      notifications,
      unreadCount: unreadCount,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

