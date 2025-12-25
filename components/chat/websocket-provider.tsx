"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useSocketIO } from "@/lib/hooks/use-socketio";
import { WebSocketMessage } from "@/lib/websocket/types";
import { useSession } from "@/lib/auth/auth-client";

interface WebSocketContextType {
  isConnected: boolean;
  send: (message: WebSocketMessage) => void;
  on: (messageType: string, callback: (message: WebSocketMessage) => void) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [wsUrl, setWsUrl] = useState<string | null>(null);

  // Get Socket.IO URL from API
  useEffect(() => {
    fetch("/api/ws")
      .then((res) => res.json())
      .then((data) => {
        if (data.socketioUrl) {
          // Use the Socket.IO URL from the API
          setWsUrl(data.socketioUrl);
        } else if (data.websocketUrl) {
          // Fallback to websocket URL if socketioUrl not available
          setWsUrl(data.websocketUrl);
        }
      })
      .catch((error) => {
        console.error("Failed to get Socket.IO URL:", error);
        // Fallback to default Socket.IO server
        const isSecure = typeof window !== "undefined" && window.location.protocol === "https:";
        const defaultPort = process.env.NEXT_PUBLIC_SOCKETIO_PORT || "3001";
        const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
        setWsUrl(isSecure ? `https://${host}:${defaultPort}` : `http://${host}:${defaultPort}`);
      });
  }, []);

  // Get token from session (user ID for authentication)
  const token = session?.user?.id || "";

  const { isConnected, send, on } = useSocketIO(
    wsUrl && token ? wsUrl : null,
    token || null
  );

  // Debug logging
  useEffect(() => {
    console.log("[WEBSOCKET-PROVIDER] URL:", wsUrl);
    console.log("[WEBSOCKET-PROVIDER] Token:", token ? "PRESENT" : "MISSING");
    console.log("[WEBSOCKET-PROVIDER] Connected:", isConnected);
  }, [wsUrl, token, isConnected]);

  return (
    <WebSocketContext.Provider value={{ isConnected, send, on }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocketContext must be used within WebSocketProvider");
  }
  return context;
}

