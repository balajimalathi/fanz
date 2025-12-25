"use client";

import { WebSocketProvider } from "@/components/chat/websocket-provider";
import { useSession } from "@/lib/auth/auth-client";

export function WebSocketWrapper({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();

  // Only provide WebSocket if user is logged in
  if (!session?.user) {
    return <>{children}</>;
  }

  return <WebSocketProvider>{children}</WebSocketProvider>;
}

