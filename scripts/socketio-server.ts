#!/usr/bin/env tsx
/**
 * Socket.IO Server for Chat System
 * Run this alongside Next.js: pnpm socketio:server
 */

import { Server as HTTPServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { initializeSocketIOServer, setGlobalIO } from "@/lib/socketio/server";

const PORT = process.env.SOCKETIO_PORT ? parseInt(process.env.SOCKETIO_PORT) : 3001;

// Create HTTP server
const httpServer = new HTTPServer();

// Create Socket.IO server
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL || "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  allowEIO3: true,
});

// Set global IO instance for API routes
setGlobalIO(io);

// Initialize Socket.IO server with handlers
initializeSocketIOServer(io);

// Start server
httpServer.listen(PORT, () => {
  console.log(`Socket.IO server listening on port ${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, closing Socket.IO server");
  io.close(() => {
    httpServer.close(() => {
      process.exit(0);
    });
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received, closing Socket.IO server");
  io.close(() => {
    httpServer.close(() => {
      process.exit(0);
    });
  });
});

