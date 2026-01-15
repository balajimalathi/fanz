"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface LiveIndicatorProps {
  creatorId: string;
  onClick: (streamId: string, streamType: "free" | "follower_only" | "paid", price?: number | null) => void;
}

export function LiveIndicator({ creatorId, onClick }: LiveIndicatorProps) {
  const [isLive, setIsLive] = useState(false);
  const [streamData, setStreamData] = useState<{
    id: string;
    streamType: "free" | "follower_only" | "paid";
    price?: number | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    if (!creatorId) return;

    const connectSSE = () => {
      // Close existing connection if any
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      try {
        const eventSource = new EventSource(
          `/api/live/active/${creatorId}/stream`
        );
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
          setIsLoading(false);
          reconnectAttemptsRef.current = 0;
        };

        eventSource.addEventListener("connected", () => {
          setIsLoading(false);
        });

        eventSource.addEventListener("stream_status", (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.stream) {
              setIsLive(true);
              setStreamData({
                id: data.stream.id,
                streamType: data.stream.streamType,
                price: data.stream.price,
              });
            } else {
              setIsLive(false);
              setStreamData(null);
            }
          } catch (error) {
            console.error("Error parsing stream_status event:", error);
          }
        });

        eventSource.addEventListener("stream_started", (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.stream) {
              setIsLive(true);
              setStreamData({
                id: data.stream.id,
                streamType: data.stream.streamType,
                price: data.stream.price,
              });
            }
          } catch (error) {
            console.error("Error parsing stream_started event:", error);
          }
        });

        eventSource.addEventListener("stream_ended", () => {
          setIsLive(false);
          setStreamData(null);
        });

        eventSource.addEventListener("heartbeat", () => {
          // Heartbeat received, connection is alive
        });

        eventSource.addEventListener("error", (event) => {
          try {
            const messageEvent = event as MessageEvent;
            if (messageEvent.data) {
              const data = JSON.parse(messageEvent.data);
              console.error("SSE error event from server:", data);
              setIsLoading(false);
            }
          } catch (error) {
            // Not a JSON error event, might be connection error
          }
        });

        eventSource.onerror = (error) => {
          // Check if connection is closed
          if (eventSource.readyState === EventSource.CLOSED) {
            console.error("SSE connection closed");
            setIsLoading(false);
            
            // Attempt to reconnect
            if (reconnectAttemptsRef.current < maxReconnectAttempts) {
              reconnectAttemptsRef.current++;
              const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
              console.log(`Attempting to reconnect SSE (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts}) in ${delay}ms`);
              setTimeout(() => {
                connectSSE();
              }, delay);
            } else {
              console.error("Max reconnection attempts reached");
            }
          } else if (eventSource.readyState === EventSource.CONNECTING) {
            // Still connecting, don't treat as error yet
            console.log("SSE connection in progress...");
          } else {
            console.error("SSE connection error:", error, "readyState:", eventSource.readyState);
          }
        };
      } catch (error) {
        console.error("Error setting up SSE connection:", error);
        setIsLoading(false);
      }
    };

    connectSSE();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [creatorId]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isLive || !streamData) {
    return null;
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      className="gap-2 animate-pulse"
      onClick={() => onClick(streamData.id, streamData.streamType, streamData.price)}
    >
      <span className="relative flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
        <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
      </span>
      LIVE
    </Button>
  );
}
