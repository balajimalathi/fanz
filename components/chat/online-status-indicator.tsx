"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWebSocketContext } from "./websocket-provider";
import { WebSocketMessage } from "@/lib/websocket/types";

interface OnlineStatusIndicatorProps {
  userId: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function OnlineStatusIndicator({
  userId,
  className,
  size = "md",
}: OnlineStatusIndicatorProps) {
  const [isOnline, setIsOnline] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { on } = useWebSocketContext();

  useEffect(() => {
    // Initial state fetch (one-time)
    const fetchInitial = async () => {
      try {
        const response = await fetch(`/api/users/${userId}/online-status`);
        if (response.ok) {
          const data = await response.json();
          setIsOnline(data.online || false);
        }
      } catch (error) {
        console.error("Error checking online status:", error);
        setIsOnline(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitial();

    // Listen to real-time Socket.IO events
    const unsubscribeOnline = on("presence:online", (message: WebSocketMessage) => {
      if (message.type === "presence:online" && "payload" in message) {
        const payload = message.payload as { userId: string };
        if (payload.userId === userId) {
          setIsOnline(true);
          setIsLoading(false);
        }
      }
    });

    const unsubscribeOffline = on("presence:offline", (message: WebSocketMessage) => {
      if (message.type === "presence:offline" && "payload" in message) {
        const payload = message.payload as { userId: string };
        if (payload.userId === userId) {
          setIsOnline(false);
          setIsLoading(false);
        }
      }
    });

    return () => {
      unsubscribeOnline();
      unsubscribeOffline();
    };
  }, [userId, on]);

  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  // Show loading state with a subtle indicator
  if (isLoading) {
    return (
      <div
        className={cn(
          "absolute bottom-0 right-0 rounded-full bg-background p-0.5 z-50",
          className
        )}
      >
        <div className={cn(sizeClasses[size], "rounded-full bg-muted animate-pulse")} />
      </div>
    );
  }

  // Only show indicator when online
  if (!isOnline) {
    return null;
  }

  return (
    <div
      className={cn(
        "absolute bottom-0 right-0 rounded-full bg-background p-0.5 z-50 ring-2 ring-background shadow-sm",
        className
      )}
      title="Online"
      aria-label="User is online"
    >
      <CheckCircle2
        className={cn(
          sizeClasses[size],
          "text-green-500 fill-green-500 drop-shadow-sm"
        )}
      />
    </div>
  );
}

