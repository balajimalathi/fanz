import { headers } from "next/headers";
import { desc } from "drizzle-orm";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { workspaces, user } from "@/lib/db/schema";

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

/**
 * Get or create a default workspace for the user
 * If the user has no workspaces, creates one with a default name
 */
export async function getOrCreateDefaultWorkspaceForUser(
  appUser: typeof user.$inferSelect
) {
  // Try to find an existing workspace for this user
  const existingWorkspace = await db.query.workspaces.findFirst({
    where: (w, { eq: eqOp }) => eqOp(w.createdByUserid, appUser.id),
    orderBy: (w, { desc: descOp }) => descOp(w.createdAt),
  });

  if (existingWorkspace) {
    return existingWorkspace;
  }

  // Create a default workspace if none exists
  const defaultName = `${appUser.name}'s Workspace`;
  const defaultSlug = `${appUser.email.split("@")[0]}-workspace-${Date.now()}`;

  const [newWorkspace] = await db
    .insert(workspaces)
    .values({
      id: crypto.randomUUID(),
      name: defaultName,
      slug: defaultSlug,
      createdByUserid: appUser.id,
    })
    .returning();

  if (!newWorkspace) {
    throw new Error("Failed to create default workspace");
  }

  return newWorkspace;
}
