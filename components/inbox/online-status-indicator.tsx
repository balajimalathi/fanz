"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

interface OnlineStatusIndicatorProps {
  userId: string;
  label?: string;
}

export function OnlineStatusIndicator({ userId, label }: OnlineStatusIndicatorProps) {
  const [isOnline, setIsOnline] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/presence/${userId}`);
        if (res.ok) {
          const { online } = await res.json();
          setIsOnline(online);
        }
      } catch (error) {
        console.error("Error checking online status:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [userId]);

  if (isLoading) {
    return (
      <Badge variant="secondary" className="animate-pulse">
        {label ? `${label}: Checking...` : "Checking..."}
      </Badge>
    );
  }

  return (
    <Badge variant={isOnline ? "default" : "secondary"}>
      {label ? `${label}: ` : ""}
      {isOnline ? "Online" : "Offline"}
    </Badge>
  );
}

