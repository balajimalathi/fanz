#!/usr/bin/env tsx
/**
 * WebSocket Server for Chat System
 * Run this alongside Next.js: pnpm websocket:server
 */

import { WebSocketServer, WebSocket } from "ws";
import { handleConnection } from "@/lib/websocket/server";
import { authenticateWebSocket } from "@/lib/websocket/auth";

const PORT = process.env.WEBSOCKET_PORT ? parseInt(process.env.WEBSOCKET_PORT) : 8080;

const wss = new WebSocketServer({
  port: PORT,
  perMessageDeflate: false,
});

console.log(`WebSocket server listening on port ${PORT}`);

wss.on("connection", async (ws: WebSocket, req: any) => {
  try {
    // Create headers object for auth - prioritize cookies
    const headers = new Headers();
    if (req.headers.cookie) {
      headers.set("cookie", req.headers.cookie);
    }

    // Also check for token in query string (fallback)
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const token = url.searchParams.get("token");
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    } else if (req.headers.authorization) {
      headers.set("authorization", req.headers.authorization);
    }

    // Authenticate user
    const auth = await authenticateWebSocket(headers);
    if (!auth) {
      ws.close(1008, "Authentication failed");
      return;
    }

    // Handle connection
    handleConnection(auth.userId, ws as unknown as WebSocket);

    console.log(`User ${auth.userId} connected`);
  } catch (error: any) {
    console.error("Error establishing WebSocket connection:", error);
    ws.close(1011, "Internal server error");
  }
});

wss.on("error", (error: Error) => {
  console.error("WebSocket server error:", error);
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received, closing WebSocket server");
  wss.close(() => {
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received, closing WebSocket server");
  wss.close(() => {
    process.exit(0);
  });
});

