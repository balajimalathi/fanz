/**
 * Socket.IO endpoint configuration
 * Returns the Socket.IO server URL for client connections
 */

import { NextRequest, NextResponse } from "next/server";
import { env } from "@/env";

export async function GET(request: NextRequest) {
  // If SOCKETIO_URL is explicitly set, use it
  if (process.env.SOCKETIO_URL) {
    return NextResponse.json({
      socketioUrl: process.env.SOCKETIO_URL,
      websocketUrl: process.env.SOCKETIO_URL, // Backward compatibility
      message: "Connect to the Socket.IO server at the provided URL",
    });
  }

  // Otherwise, derive Socket.IO URL from app URL
  const appUrl = env.NEXT_PUBLIC_APP_URL || env.BETTER_AUTH_URL;
  const socketioPort = process.env.SOCKETIO_PORT || "3001";
  
  if (appUrl) {
    try {
      const url = new URL(appUrl);
      // Use same protocol and hostname, but different port for Socket.IO
      const socketioUrl = `${url.protocol}//${url.hostname}:${socketioPort}`;
      return NextResponse.json({
        socketioUrl,
        websocketUrl: socketioUrl, // Backward compatibility
        message: "Connect to the Socket.IO server at the provided URL",
      });
    } catch (e) {
      // Invalid URL, fall through to default
    }
  }

  // Fallback to localhost (development)
  const isSecure = request.headers.get("x-forwarded-proto") === "https" || 
                   request.url.startsWith("https://");
  const protocol = isSecure ? "https" : "http";
  const defaultUrl = `${protocol}://localhost:${socketioPort}`;
  
  return NextResponse.json({
    socketioUrl: defaultUrl,
    websocketUrl: defaultUrl, // Backward compatibility
    message: "Connect to the Socket.IO server at the provided URL",
  });
}

