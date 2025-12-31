"use client";

import { useState, useEffect } from "react";
import { Room, LocalTrack } from "livekit-client";
import { useRoom } from "./room-provider";
import { Button } from "@/components/ui/button";
import { PhoneOff, Video, VideoOff, Mic, MicOff } from "lucide-react";

interface CallControlsProps {
  onLeave?: () => void;
}

export function CallControls({ onLeave }: CallControlsProps) {
  const { room, isConnected } = useRoom();
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  useEffect(() => {
    if (!room || !isConnected) return;

    const publishTracks = async () => {
      try {
        // Get user media and publish
        const tracks = await Room.createLocalTracks({
          audio: true,
          video: true,
        });

        await room.localParticipant.publishTracks(tracks);

        // Set initial states
        setIsAudioEnabled(true);
        setIsVideoEnabled(true);
      } catch (error) {
        console.error("Error publishing tracks:", error);
      }
    };

    publishTracks();
  }, [room, isConnected]);

  const toggleAudio = async () => {
    if (!room) return;

    try {
      const newState = !isAudioEnabled;
      await room.localParticipant.setMicrophoneEnabled(newState);
      setIsAudioEnabled(newState);
    } catch (error) {
      console.error("Error toggling audio:", error);
    }
  };

  const toggleVideo = async () => {
    if (!room) return;

    try {
      const newState = !isVideoEnabled;
      await room.localParticipant.setCameraEnabled(newState);
      setIsVideoEnabled(newState);
    } catch (error) {
      console.error("Error toggling video:", error);
    }
  };

  const handleLeave = async () => {
    if (room) {
      // Stop all local tracks
      room.localParticipant.trackPublications.forEach((pub) => {
        if (pub.track) {
          pub.track.stop();
        }
      });
      await room.disconnect();
    }
    onLeave?.();
  };

  if (!isConnected || !room) {
    return null;
  }

  return (
    <div className="flex gap-2 items-center">
      <Button
        variant={isAudioEnabled ? "default" : "destructive"}
        size="icon"
        onClick={toggleAudio}
      >
        {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
      </Button>
      <Button
        variant={isVideoEnabled ? "default" : "destructive"}
        size="icon"
        onClick={toggleVideo}
      >
        {isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
      </Button>
      <Button variant="destructive" size="icon" onClick={handleLeave}>
        <PhoneOff className="h-4 w-4" />
      </Button>
    </div>
  );
}
