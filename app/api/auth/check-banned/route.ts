import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Internal API endpoint to check if the current user is banned
 * Used by middleware to check banned status in Edge runtime
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    // If no session, user is not banned (they're not authenticated)
    if (!session?.user?.id) {
      return NextResponse.json({ banned: false });
    }

    // Get user record from database
    const userRecord = await db.query.user.findFirst({
      where: (u, { eq: eqOp }) => eqOp(u.id, session.user.id),
    });

    if (!userRecord) {
      return NextResponse.json({ banned: false });
    }

    // Check if user is banned
    if (userRecord.banned) {
      // Check if ban has expired
      if (userRecord.banExpires && new Date(userRecord.banExpires) < new Date()) {
        // Ban has expired, unban the user
        await db
          .update(user)
          .set({
            banned: false,
            banReason: null,
            banExpires: null,
            updatedAt: new Date(),
          })
          .where(eq(user.id, session.user.id));
        return NextResponse.json({ banned: false });
      }

      // User is banned
      return NextResponse.json({ banned: true }, { status: 403 });
    }

    return NextResponse.json({ banned: false });
  } catch (error: any) {
    // If better-auth throws an error (e.g., FORBIDDEN for banned user),
    // treat it as banned
    if (error?.status === "FORBIDDEN" || error?.code === "BANNED_USER" || error?.message?.includes("banned")) {
      return NextResponse.json({ banned: true }, { status: 403 });
    }

    // On other errors, fail open (don't block access)
    console.error("Error checking banned user:", error);
    return NextResponse.json({ banned: false });
  }
}
