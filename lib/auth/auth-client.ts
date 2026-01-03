import { createAuthClient } from "better-auth/react";

// type for auth client if incase not properly configured.
type BAClient = ReturnType<typeof createAuthClient>;

/**
 * Get the base URL for auth client
 * 
 * We use the current window origin in the browser to ensure requests are
 * treated as Same-Origin or Same-Site.
 * 
 * Since the API routes (/api/auth/*) are available on all subdomains (via Next.js),
 * calling them on the current subdomain allows cookies (SameSite=Lax) to be sent correctly.
 * 
 * The Cross-Subdomain cookie configuration in auth.ts ensures the state is shared.
 */
const getBaseURL = () => {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
};

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
  fetchOptions: {
    credentials: "include",
  },
});

const { useSession, signOut } = authClient;
export { useSession, signOut };