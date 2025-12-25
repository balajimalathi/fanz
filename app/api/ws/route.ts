/**
 * WebSocket endpoint (fallback - WebSocket upgrades don't work in Next.js API routes)
 * Use the separate WebSocket server script instead
 * This route can be used for connection info or fallback to HTTP polling
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // WebSocket upgrades are not supported in Next.js API routes
  // Use the separate WebSocket server at WEBSOCKET_URL
  const wsUrl = process.env.WEBSOCKET_URL || "ws://localhost:8080";

  return NextResponse.json({
    websocketUrl: wsUrl,
    message: "Connect to the WebSocket server at the provided URL",
  });
}

