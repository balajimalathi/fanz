import { NextRequest, NextResponse } from "next/server";

/**
 * Set Session Route
 * 
 * This route runs on the DESTINATION subdomain (e.g. skndan.localhost).
 * It receives a session token via query param (from port-session)
 * and sets the session cookie on the current domain.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const callback = request.nextUrl.searchParams.get("callback");

  if (!token || !callback) {
    return new NextResponse("Missing token or callback", { status: 400 });
  }

  // Create response with redirect
  const response = NextResponse.redirect(callback);

  // Set the session cookie
  // We mirror the better-auth cookie settings (HttpOnly, etc.)
  // Note: we don't set 'domain' attribute to let it default to current host (Host-Only)
  // or we could explicitly set it to 'localhost' if we wanted sharing.
  // But the goal here is to make it work on this specific subdomain.

  response.cookies.set("better-auth.session_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // False on localhost http
    sameSite: "lax", // Lax is fine for same-site
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days (default)
  });

  return response;
}
