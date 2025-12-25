"use client";

import { useState, useEffect } from "react";
import { PhoneOff, Mic, MicOff, Video, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LiveKitRoom } from "./livekit-room";

interface CallWindowProps {
  callId: string;
  roomName: string;
  token: string;
  url: string;
  callType: "audio" | "video";
  onEnd: () => void;
}

export function CallWindow({
  callId,
  roomName,
  token,
  url,
  callType,
  onEnd,
}: CallWindowProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === "video");
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleEnd = async () => {
    try {
      await fetch(`/api/calls/${callId}/end`, {
        method: "POST",
        body: JSON.stringify({ duration }),
      });
    } catch (error) {
      console.error("Error ending call:", error);
    } finally {
      onEnd();
    }
  };

  return (
    <div className="flex flex-col h-full bg-black text-white">
      <div className="flex-1 relative">
        <LiveKitRoom
          url={url}
          token={token}
          roomName={roomName}
          audioEnabled={!isMuted}
          videoEnabled={isVideoEnabled && callType === "video"}
        />
      </div>
      <div className="p-4 bg-black/50 backdrop-blur">
        <div className="flex items-center justify-center gap-4">
          <div className="text-white text-lg">{formatDuration(duration)}</div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsMuted(!isMuted)}
            className="rounded-full h-12 w-12"
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>
          {callType === "video" && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsVideoEnabled(!isVideoEnabled)}
              className="rounded-full h-12 w-12"
            >
              {isVideoEnabled ? (
                <VideoOff className="h-5 w-5" />
              ) : (
                <Video className="h-5 w-5" />
              )}
            </Button>
          )}
          <Button
            variant="destructive"
            size="icon"
            onClick={handleEnd}
            className="rounded-full h-12 w-12"
          >
            <PhoneOff className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

