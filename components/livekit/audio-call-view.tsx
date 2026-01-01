"use client";

import { useEffect, useState } from "react";
import { useRoomContext, useRemoteParticipants, RoomAudioRenderer } from "@livekit/components-react";
import { CallControls } from "./call-controls";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AudioCallViewProps {
  otherParticipantName: string;
  otherParticipantImage?: string | null;
  onCallEnd?: () => void;
}

export function AudioCallView({
  otherParticipantName,
  otherParticipantImage,
  onCallEnd,
}: AudioCallViewProps) {
  const room = useRoomContext();
  const remoteParticipants = useRemoteParticipants();
  const [callDuration, setCallDuration] = useState(0);

  // Track call duration
  useEffect(() => {
    if (!room) {
      setCallDuration(0);
      return;
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [room]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (!room) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-background">
        <div className="text-center space-y-4">
          <div className="h-16 w-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Connecting...</p>
        </div>
      </div>
    );
  }

  const isConnected = remoteParticipants.length > 0 || room.state === "connected";

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Main content area */}
      <div className="flex-1 flex flex-col items-center justify-center space-y-8 p-8">
        {/* Participant avatar */}
        <Avatar className="h-32 w-32">
          <AvatarImage src={otherParticipantImage || undefined} alt={otherParticipantName} />
          <AvatarFallback className="text-4xl">
            {otherParticipantName.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        {/* Participant name */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-semibold">{otherParticipantName}</h2>
          <p className="text-sm text-muted-foreground">
            {formatDuration(callDuration)}
          </p>
        </div>

        {/* Status */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            {isConnected ? "Connected" : "Connecting..."}
          </p>
        </div>
      </div>

      {/* Call controls */}
      <div className="border-t p-4 bg-muted/30">
        <div className="flex justify-center">
          <CallControls onLeave={onCallEnd} callType="audio" />
        </div>
      </div>

      {/* Audio tracks rendered automatically by RoomAudioRenderer */}
      <RoomAudioRenderer />
    </div>
  );
}

