import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { notification } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// PATCH - Mark notification as read
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: notificationId } = await params;

    // Verify notification belongs to user
    const notificationRecord = await db.query.notification.findFirst({
      where: (n, { eq: eqOp, and: andOp }) =>
        andOp(
          eqOp(n.id, notificationId),
          eqOp(n.userId, session.user.id)
        ),
    });

    if (!notificationRecord) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    // Mark as read
    await db
      .update(notification)
      .set({ read: true })
      .where(eq(notification.id, notificationId));

    return NextResponse.json({
      success: true,
      message: "Notification marked as read",
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

