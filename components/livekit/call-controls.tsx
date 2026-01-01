"use client";

import { useRoomContext, useLocalParticipant } from "@livekit/components-react";
import { Button } from "@/components/ui/button";
import { PhoneOff, Video, VideoOff, Mic, MicOff } from "lucide-react";

interface CallControlsProps {
  onLeave?: () => void;
  callType?: "audio" | "video";
}

export function CallControls({ onLeave, callType = "video" }: CallControlsProps) {
  const room = useRoomContext();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();

  const toggleAudio = async () => {
    if (!localParticipant) return;

    try {
      const newState = !isMicrophoneEnabled;
      await localParticipant.setMicrophoneEnabled(newState);
    } catch (error) {
      console.error("Error toggling audio:", error);
    }
  };

  const toggleVideo = async () => {
    if (!localParticipant) return;

    try {
      const newState = !isCameraEnabled;
      await localParticipant.setCameraEnabled(newState);
    } catch (error) {
      console.error("Error toggling video:", error);
    }
  };

  const handleLeave = async () => {
    if (room) {
      // Stop all local tracks
      localParticipant?.trackPublications.forEach((pub: any) => {
        if (pub.track) {
          pub.track.stop();
        }
      });
      await room.disconnect();
    }
    onLeave?.();
  };

  if (!room || !localParticipant) {
    return null;
  }

  return (
    <div className="flex gap-2 items-center">
      <Button
        variant={isMicrophoneEnabled ? "default" : "destructive"}
        size="icon"
        onClick={toggleAudio}
      >
        {isMicrophoneEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
      </Button>
      {callType === "video" && (
        <Button
          variant={isCameraEnabled ? "default" : "destructive"}
          size="icon"
          onClick={toggleVideo}
        >
          {isCameraEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
        </Button>
      )}
      <Button variant="destructive" size="icon" onClick={handleLeave}>
        <PhoneOff className="h-4 w-4" />
      </Button>
    </div>
  );
}
