"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useLiveKitCall } from "@/hooks/use-livekit-call";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from "lucide-react";

interface FulfillmentCallControlsProps {
  serviceOrderId: string;
  callType: "audio" | "video";
}

export function FulfillmentCallControls({
  serviceOrderId,
  callType,
}: FulfillmentCallControlsProps) {
  const [isInCall, setIsInCall] = useState(false);
  const { room, isConnected, isMuted, isVideoEnabled, connect, disconnect, toggleMute, toggleVideo, error } =
    useLiveKitCall(isInCall ? serviceOrderId : null, callType);

  const handleJoinCall = async () => {
    try {
      await connect();
      setIsInCall(true);
    } catch (error) {
      console.error("Error joining call:", error);
    }
  };

  const handleLeaveCall = () => {
    disconnect();
    setIsInCall(false);
  };

  return (
    <div className="space-y-4">
      {!isInCall ? (
        <Button onClick={handleJoinCall} className="w-full" size="lg">
          <Phone className="h-4 w-4 mr-2" />
          Join {callType === "video" ? "Video" : "Audio"} Call
        </Button>
      ) : (
        <div className="space-y-2">
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
              {error}
            </div>
          )}

          <div className="flex gap-2 justify-center">
            <Button
              variant={isMuted ? "destructive" : "outline"}
              size="icon"
              onClick={toggleMute}
            >
              {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>

            {callType === "video" && (
              <Button
                variant={!isVideoEnabled ? "destructive" : "outline"}
                size="icon"
                onClick={toggleVideo}
              >
                {isVideoEnabled ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
              </Button>
            )}

            <Button variant="destructive" size="icon" onClick={handleLeaveCall}>
              <PhoneOff className="h-4 w-4" />
            </Button>
          </div>

          {isConnected && (
            <p className="text-sm text-center text-muted-foreground">
              Call connected
            </p>
          )}
        </div>
      )}
    </div>
  );
}

