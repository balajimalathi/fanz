"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useWebSocket } from "@/lib/hooks/use-websocket";
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

  // Get WebSocket URL from API
  useEffect(() => {
    fetch("/api/ws")
      .then((res) => res.json())
      .then((data) => {
        if (data.websocketUrl) {
          // Extract WebSocket URL (ws:// or wss://)
          const url = data.websocketUrl.replace(/^https?:\/\//, "").replace(/^/, "ws://");
          setWsUrl(url);
        }
      })
      .catch((error) => {
        console.error("Failed to get WebSocket URL:", error);
        // Fallback to default
        setWsUrl("ws://localhost:8080");
      });
  }, []);

  // Get token from session (for now using a placeholder - better-auth uses cookies)
  // WebSocket server should read cookies from connection
  const token = session?.user?.id || "";

  const { isConnected, send, on } = useWebSocket(
    wsUrl && token ? wsUrl : null,
    token || null
  );

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

