import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/client"
import { user } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { redirect } from "next/navigation"

/**
 * Check if the current user is banned and redirect to suspended page if so
 * @returns The user record if not banned, null if banned (redirects to /suspended)
 */
export async function checkBannedUser() {
  let session
  try {
    session = await auth.api.getSession({
      headers: await headers(),
    })
  } catch (error: any) {
    // If better-auth throws an error (e.g., FORBIDDEN for banned user),
    // check if it's a banned user error and redirect
    if (error?.status === "FORBIDDEN" || error?.code === "BANNED_USER" || error?.message?.includes("banned")) {
      redirect("/suspended")
    }
    
    console.error("Error checking session:", error)
    // On other errors, don't block access (fail open)
    return null
  }

  if (!session?.user?.id) {
    return null
  }

  const userRecord = await db.query.user.findFirst({
    where: (u, { eq: eqOp }) => eqOp(u.id, session.user.id),
  })

  if (!userRecord) {
    return null
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
        .where(eq(user.id, session.user.id))
      return userRecord
    }
    
    // User is banned, redirect to suspended page
    // Note: redirect() throws NEXT_REDIRECT which is caught by Next.js router
    // This is expected behavior and will perform the redirect
    redirect("/suspended")
  }

  return userRecord
}
