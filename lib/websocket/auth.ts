import { auth } from "@/lib/auth/auth";
import { cookies } from "next/headers";

/**
 * Authenticate WebSocket connection using session token
 */
export async function authenticateWebSocket(
  headers: Headers
): Promise<{ userId: string; role: string | null } | null> {
  try {
    // Get session from cookies
    const session = await auth.api.getSession({
      headers: await Promise.resolve(headers),
    });

    if (!session?.user?.id) {
      return null;
    }

    return {
      userId: session.user.id,
      role: session.user.role || null,
    };
  } catch (error) {
    console.error("WebSocket authentication error:", error);
    return null;
  }
}

