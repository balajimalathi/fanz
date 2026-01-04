import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { NextResponse } from "next/server"

/**
 * Check if the current session user has admin role
 * @returns The user object if admin, null otherwise
 */
export async function requireAdmin() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  console.log("session", session)

  if (!session?.user) {
    return null
  }

  if (session.user.role !== "admin") {
    return null
  }

  return session.user
}

/**
 * Middleware-like function to check admin access in API routes
 * Returns a NextResponse with 401/403 if not authorized, or null if authorized
 */
export async function checkAdminAccess(): Promise<NextResponse | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Admin role required" }, { status: 403 })
  }

  return null
}

