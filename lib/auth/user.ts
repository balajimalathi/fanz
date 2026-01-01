import { headers } from "next/headers";
import { desc } from "drizzle-orm";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { user } from "@/lib/db/schema";

/**
 * Get the current authenticated user from better-auth session
 * @throws {Error} If user is not authenticated
 */
export async function getCurrentAppUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Unauthorized: No authenticated user found");
  }

  // Fetch full user record from database to ensure we have all fields
  const userRecord = await db.query.user.findFirst({
    where: (u, { eq: eqOp }) => eqOp(u.id, session.user.id),
  });

  if (!userRecord) {
    throw new Error("User not found in database");
  }

  return userRecord;
}