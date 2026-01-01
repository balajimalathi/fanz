"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    const checkLiveStatus = async () => {
      try {
        const response = await fetch(`/api/live/active/${creatorId}`);
        const data = await response.json();

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
        console.error("Error checking live status:", error);
        setIsLive(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkLiveStatus();

    // Poll every 5 seconds to check if stream is still live
    const interval = setInterval(checkLiveStatus, 5000);

    return () => clearInterval(interval);
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
