import { NextRequest, NextResponse } from "next/server";

/**
 * Port Session Route
 * 
 * This route is called on the MAIN domain (where the session cookie exists).
 * It reads the session token from the cookie and redirects to the 
 * subdomain's /api/auth/set-session endpoint with the token.
 */
export async function GET(request: NextRequest) {
  const returnUrl = request.nextUrl.searchParams.get("returnUrl");

  if (!returnUrl) {
    return new NextResponse("Missing returnUrl", { status: 400 });
  }

  // Get session token from cookies
  // Better-auth uses "better-auth.session_token" or "__Secure-better-auth.session_token"
  const sessionToken =
    request.cookies.get("better-auth.session_token")?.value ||
    request.cookies.get("__Secure-better-auth.session_token")?.value;

  if (!sessionToken) {
    // If no session, just redirect back (authentication failed)
    return NextResponse.redirect(returnUrl);
  }

  // Check if return URL is safe (allowed domain)
  // We reuse the valid origin check logic implicitly by parsing
  let targetOrigin: string;
  try {
    const url = new URL(returnUrl);
    targetOrigin = url.origin;

    // Safety check: ensure we are redirecting to our own domains
    if (!targetOrigin.includes("localhost") && !targetOrigin.includes("skndan.cloud")) {
      return new NextResponse("Invalid redirect domain", { status: 403 });
    }
  } catch {
    return new NextResponse("Invalid returnUrl", { status: 400 });
  }

  // Construct the set-session URL on the target subdomain
  const setSessionUrl = new URL(`${targetOrigin}/api/auth/set-session`);
  setSessionUrl.searchParams.set("token", sessionToken);
  setSessionUrl.searchParams.set("callback", returnUrl);

  return NextResponse.redirect(setSessionUrl);
}
