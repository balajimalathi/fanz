"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ConversationTimerProps {
  initialSeconds?: number | null; // Remaining time in seconds (for service duration)
  expiresAt?: number | null; // Timestamp when timer expires (for acceptance window)
  type?: "service" | "acceptance"; // Type of timer
  onExpire?: () => void;
  className?: string;
}

export function ConversationTimer({
  initialSeconds,
  expiresAt,
  type = "service",
  onExpire,
  className,
}: ConversationTimerProps) {
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(initialSeconds);

  useEffect(() => {
    if (type === "acceptance" && expiresAt) {
      // Calculate remaining time from expiration timestamp
      const updateTimer = () => {
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
        setRemainingSeconds(remaining);
        
        if (remaining <= 0 && onExpire) {
          onExpire();
        }
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    } else if (type === "service" && initialSeconds !== null) {
      // Countdown from initial seconds
      if (initialSeconds <= 0) {
        setRemainingSeconds(0);
        if (onExpire) {
          onExpire();
        }
        return;
      }

      setRemainingSeconds(initialSeconds);
      const interval = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev === null || prev <= 0) {
            clearInterval(interval);
            if (onExpire) {
              onExpire();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [initialSeconds, expiresAt, type, onExpire]);

  // Format time as MM:SS or HH:MM:SS
  const formatTime = (seconds: number): string => {
    if (seconds < 0) return "00:00";
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (remainingSeconds === null) {
    return null;
  }

  const isExpiring = remainingSeconds <= 10 && type === "acceptance";
  const isExpired = remainingSeconds <= 0;

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-sm font-mono",
        isExpiring && "text-amber-600 dark:text-amber-400",
        isExpired && "text-destructive",
        className
      )}
    >
      {type === "acceptance" && (
        <span className="text-xs text-muted-foreground">Accept in:</span>
      )}
      <span
        className={cn(
          "tabular-nums",
          isExpiring && "animate-pulse",
          isExpired && "opacity-50"
        )}
      >
        {formatTime(remainingSeconds)}
      </span>
      {type === "service" && remainingSeconds > 0 && (
        <span className="text-xs text-muted-foreground">remaining</span>
      )}
    </div>
  );
}

