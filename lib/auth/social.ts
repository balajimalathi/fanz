import { authClient } from "./auth-client";

/**
 * Get the main domain URL (without subdomain) for OAuth routing
 * All OAuth requests must go through the main domain since Google doesn't support wildcard URIs
 */
function getMainDomain(): string {
  // Server-side fallback
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  }

  const { protocol, hostname, port } = window.location;
  const portSuffix = port ? `:${port}` : "";

  // Handle localhost
  if (hostname.includes("localhost")) {
    return `${protocol}//localhost${portSuffix}`;
  }

  // Handle production domains (e.g., subdomain.skndan.cloud -> skndan.cloud)
  const parts = hostname.split(".");
  if (parts.length >= 2) {
    // Get the base domain (last 2 parts: domain.tld)
    const baseDomain = parts.slice(-2).join(".");
    return `${protocol}//${baseDomain}${portSuffix}`;
  }

  // Fallback to current origin
  return window.location.origin;
}

/**
 * Check if the current origin is a subdomain
 */
function isSubdomain(): boolean {
  if (typeof window === "undefined") return false;

  const { hostname, port } = window.location;
  const portSuffix = port ? `:${port}` : "";

  // For localhost: subdomain.localhost vs localhost
  if (hostname.includes("localhost")) {
    const parts = hostname.split(".");
    return parts.length > 1 && parts[parts.length - 1] === "localhost";
  }

  // For production: check if there are more than 2 parts (subdomain.domain.tld)
  const parts = hostname.split(".");
  if (parts.length > 2) {
    // Exclude common prefixes that aren't user subdomains
    const excludedPrefixes = ["www", "api", "app", "admin", "mail", "ftp"];
    return !excludedPrefixes.includes(parts[0].toLowerCase());
  }

  return false;
}

/**
 * Google sign-in handler with wildcard subdomain support
 * 
 * When called from a subdomain (e.g., john.localhost:3000), this function:
 * 1. Routes the OAuth flow through the main domain (localhost:3000)
 * 2. Stores the original subdomain URL to redirect back after auth
 * 3. The callback page handles redirecting back to the subdomain
 * 
 * @param callbackURL - The path to redirect to after authentication (default: "/home")
 */
export const googleSignin = async (callbackURL: string = "/home") => {
  const mainDomain = getMainDomain();

  // Check if we're on a subdomain
  if (isSubdomain()) {
    const currentOrigin = window.location.origin;

    // Determine the full return URL
    // callbackURL might be a full URL (from login-modal) or a path (from login-form)
    let returnUrl: string;

    if (callbackURL.startsWith("http://") || callbackURL.startsWith("https://")) {
      // callbackURL is already a full URL, use it directly
      // But ensure it's using the current subdomain origin, not duplicating
      try {
        const parsedUrl = new URL(callbackURL);
        // Use just the pathname from the provided URL, combined with current origin
        returnUrl = `${currentOrigin}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
      } catch {
        // Invalid URL, fall back to using pathname
        returnUrl = `${currentOrigin}/`;
      }
    } else {
      // callbackURL is a path, combine with current origin
      const returnPath = callbackURL.startsWith("/") ? callbackURL : `/${callbackURL}`;
      returnUrl = `${currentOrigin}${returnPath}`;
    }

    // Route through main domain with encoded return URL
    // The oauth-callback page will handle redirecting back to the subdomain
    const oauthCallbackPath = `/auth/oauth-callback?returnUrl=${encodeURIComponent(returnUrl)}`;

    // Redirect to main domain to initiate OAuth
    // Store returnUrl in sessionStorage as backup (in case URL gets too long)
    sessionStorage.setItem("oauth_return_url", returnUrl);

    // Use the main domain for OAuth initiation
    window.location.href = `${mainDomain}/login?redirect=${encodeURIComponent(oauthCallbackPath)}&subdomain_auth=true`;
    return;
  }

  // Standard flow for main domain
  await authClient.signIn.social({
    provider: "google",
    callbackURL,
  });
};