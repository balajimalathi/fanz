"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface StreamTimerProps {
  startedAt: string | Date;
  className?: string;
}

export function StreamTimer({ startedAt, className = "" }: StreamTimerProps) {
  const [duration, setDuration] = useState("00:00:00");

  useEffect(() => {
    const startTime = new Date(startedAt).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000); // elapsed seconds

      const hours = Math.floor(elapsed / 3600);
      const minutes = Math.floor((elapsed % 3600) / 60);
      const seconds = elapsed % 60;

      const formatted = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
      setDuration(formatted);
    };

    // Update immediately
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [startedAt]);

  return (
    <div className={`flex items-center gap-1.5 md:gap-2 ${className}`}>
      <Clock className="h-3 w-3 md:h-4 md:w-4" />
      <span className="text-xs md:text-sm font-medium">{duration}</span>
    </div>
  );
}
