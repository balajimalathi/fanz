import { auth } from "@/lib/auth/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest, NextResponse } from "next/server";

/**
 * Check if the origin is allowed for CORS
 * Allow localhost and all subdomains, plus production domain and all its subdomains
 */
function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;

  try {
    const url = new URL(origin);
    const hostname = url.hostname;

    // Allow localhost and subdomains
    if (hostname === "localhost" || hostname.endsWith(".localhost")) {
      return true;
    }

    // Allow production domain and subdomains
    if (hostname === "skndan.cloud" || hostname.endsWith(".skndan.cloud")) {
      return true;
    }

    // Allow tunnel URLs for development
    if (hostname.endsWith(".srv.us")) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Wrap the auth handler with CORS support for cross-subdomain requests
 */
async function handleWithCORS(request: NextRequest) {
  const origin = request.headers.get("origin");

  // Handle preflight requests
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": origin && isAllowedOrigin(origin) ? origin : "",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, Cookie",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // Get the auth handler
  const handlers = toNextJsHandler(auth.handler);

  // Call the appropriate handler - better-auth handlers return standard Response
  let response: Response;
  if (request.method === "GET") {
    response = await handlers.GET(request);
  } else if (request.method === "POST") {
    response = await handlers.POST(request);
  } else {
    return new NextResponse("Method not allowed", { status: 405 });
  }

  // Convert Response to NextResponse and add CORS headers
  const body = await response.text();
  const headers = new Headers(response.headers);

  // Add CORS headers if origin is allowed
  if (origin && isAllowedOrigin(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
  }

  return new NextResponse(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export const GET = handleWithCORS;
export const POST = handleWithCORS;
export const OPTIONS = handleWithCORS;