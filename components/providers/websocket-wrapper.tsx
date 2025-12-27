"use client";

import { WebSocketProvider } from "@/components/chat/websocket-provider";

export function WebSocketWrapper({ children }: { children: React.ReactNode }) {
  // Always provide WebSocketProvider - it handles the no-session case internally
  // This ensures useWebSocketContext is always available when components need it
  return <WebSocketProvider>{children}</WebSocketProvider>;
}

