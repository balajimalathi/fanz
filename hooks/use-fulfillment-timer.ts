"use client";

import { useState, useEffect, useCallback } from "react";

export interface FulfillmentTimerProps {
  activatedAt: string;
  durationMinutes: number;
  onExpire?: () => void;
}

export function useFulfillmentTimer({ activatedAt, durationMinutes, onExpire }: FulfillmentTimerProps) {
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const calculateRemaining = useCallback(() => {
    if (!activatedAt) return null;

    const startTime = new Date(activatedAt).getTime();
    const durationMs = durationMinutes * 60 * 1000;
    const endTime = startTime + durationMs;
    const now = Date.now();
    const remaining = Math.max(0, Math.floor((endTime - now) / 1000));

    return remaining;
  }, [activatedAt, durationMinutes]);

  useEffect(() => {
    if (!activatedAt || isPaused) return;

    const updateTimer = () => {
      const remaining = calculateRemaining();
      
      if (remaining === null) {
        setRemainingSeconds(null);
        return;
      }

      setRemainingSeconds(remaining);

      if (remaining === 0 && !isExpired) {
        setIsExpired(true);
        if (onExpire) {
          onExpire();
        }
      }
    };

    // Update immediately
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [activatedAt, durationMinutes, isPaused, isExpired, onExpire, calculateRemaining]);

  const pause = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    setIsPaused(false);
  }, []);

  const formatTime = useCallback((seconds: number | null): string => {
    if (seconds === null) return "00:00";

    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const isWarning = remainingSeconds !== null && remainingSeconds < 300; // 5 minutes

  return {
    remainingSeconds,
    remainingTime: formatTime(remainingSeconds),
    isExpired,
    isPaused,
    isWarning,
    pause,
    resume,
  };
}

