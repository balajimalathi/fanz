import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Extract subdomain from hostname
 * Handles both production (subdomain.example.com), localhost (subdomain.localhost:3000),
 * and tunnel URLs (subdomain.tunnel-domain.srv.us)
 */
function extractSubdomain(host: string): string | null {
  // Remove port if present
  const hostWithoutPort = host.split(":")[0];
  const parts = hostWithoutPort.split(".");
  
  // Handle tunnel URL: thahryywpiigweqfxmgkq2uc3a.srv.us
  // Format: subdomain.thahryywpiigweqfxmgkq2uc3a.srv.us
  if (hostWithoutPort.includes("thahryywpiigweqfxmgkq2uc3a.srv.us")) {
    // If it's just the tunnel domain without subdomain
    if (hostWithoutPort === "thahryywpiigweqfxmgkq2uc3a.srv.us") {
      return null;
    }
    // If format is "subdomain.thahryywpiigweqfxmgkq2uc3a.srv.us", extract subdomain
    if (parts.length >= 4 && parts[parts.length - 3] === "thahryywpiigweqfxmgkq2uc3a") {
      return parts[0];
    }
    return null;
  }
  
  // Handle localhost cases: subdomain.localhost or subdomain.127.0.0.1
  if (hostWithoutPort.includes("localhost")) {
    // If it's just "localhost", no subdomain
    if (parts.length === 1) {
      return null;
    }
    // If format is "subdomain.localhost", extract subdomain
    if (parts.length >= 2 && parts[parts.length - 1] === "localhost") {
      return parts[0];
    }
    return null;
  }
  
  // Handle 127.0.0.1 cases: subdomain.127.0.0.1
  if (hostWithoutPort.includes("127.0.0.1")) {
    // If it's just "127.0.0.1", no subdomain
    if (parts.length <= 4 && parts[0] === "127") {
      return null;
    }
    // If format is "subdomain.127.0.0.1", extract subdomain
    if (parts.length >= 5 && parts[1] === "127") {
      return parts[0];
    }
    return null;
  }
  
  // Handle production domains: subdomain.example.com
  // Need at least 3 parts (subdomain.domain.tld)
  if (parts.length >= 3) {
    // Exclude common prefixes that aren't user subdomains
    const excludedPrefixes = ["www", "api", "app", "admin", "mail", "ftp"];
    const subdomain = parts[0];
    if (!excludedPrefixes.includes(subdomain.toLowerCase())) {
      return subdomain;
    }
  }
  
  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") || "";

  // Extract subdomain
  const subdomain = extractSubdomain(host);

  // Handle subdomain rewrite
  if (subdomain) {
    // Skip rewrite for API routes, auth routes, and static files
    if (
      pathname.startsWith("/api") ||
      pathname.startsWith("/_next") ||
      pathname.startsWith("/favicon.ico") ||
      pathname.startsWith("/robots.txt") ||
      pathname.startsWith("/sitemap")
    ) {
      return NextResponse.next();
    }

    // Rewrite subdomain to /u/[username]
    // Preserve the pathname and query parameters
    const rewritePath = `/u/${subdomain}${pathname === "/" ? "" : pathname}`;
    const url = request.nextUrl.clone();
    url.pathname = rewritePath;
    
    return NextResponse.rewrite(url);
  }

  // Allow /u/* paths to be public (creator profile pages)
  // These paths are accessible without authentication
  if (pathname.startsWith("/u/")) {
    return NextResponse.next();
  }

  // Protect routes starting with /home
  if (pathname.startsWith("/home")) {
    // Skip auth check for API routes and static files
    if (
      pathname.startsWith("/_next") ||
      pathname.startsWith("/favicon.ico")
    ) {
      return NextResponse.next();
    }

    // Check authentication using better-auth
    // In Edge runtime, we check for session cookie presence
    // Full session validation happens server-side in page components
    // Better-auth typically uses cookies for session management
    
    // Check for better-auth session cookie
    // The cookie name may vary, so we check common patterns
    const hasSessionCookie = 
      request.cookies.has("better-auth.session_token") ||
      request.cookies.has("better-auth.session") ||
      request.cookies.has("session_token") ||
      // Check if any cookie starts with better-auth
      Array.from(request.cookies.getAll()).some(
        (cookie) => cookie.name.startsWith("better-auth")
      );

    // If no session cookie found, redirect to login
    if (!hasSessionCookie) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  } 

  return NextResponse.next();
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (better-auth handles its own routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

