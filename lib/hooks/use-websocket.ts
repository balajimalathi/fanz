"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { WebSocketClient } from "@/lib/websocket/client";
import { WebSocketMessage } from "@/lib/websocket/types";

export function useWebSocket(url: string | null, token: string | null) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const clientRef = useRef<WebSocketClient | null>(null);

  useEffect(() => {
    if (!url || !token) {
      return;
    }

    const client = new WebSocketClient(url, token);

    client.onConnect(() => {
      setIsConnected(true);
      setConnectionError(null);
    });

    client.onDisconnect(() => {
      setIsConnected(false);
    });

    client.connect();
    clientRef.current = client;

    return () => {
      client.disconnect();
      clientRef.current = null;
    };
  }, [url, token]);

  const send = useCallback((message: WebSocketMessage) => {
    if (clientRef.current) {
      clientRef.current.send(message);
    }
  }, []);

  const on = useCallback(
    (messageType: string, callback: (message: WebSocketMessage) => void) => {
      if (!clientRef.current) {
        return () => {};
      }
      return clientRef.current.on(messageType, callback);
    },
    []
  );

  return {
    isConnected,
    connectionError,
    send,
    on,
  };
}

