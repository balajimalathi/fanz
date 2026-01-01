"use client";

import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import { AudioCallView } from "./audio-call-view";
import { VideoCallView } from "./video-call-view";
import { CallControls } from "./call-controls";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, X } from "lucide-react";
import { ActiveCall } from "./call-state-provider";

interface ActiveCallViewProps {
  activeCall: ActiveCall;
  onCallEnd: () => void;
}

export function ActiveCallView({ activeCall, onCallEnd }: ActiveCallViewProps) {
  const tokenString = typeof activeCall.token === "string" ? activeCall.token : String(activeCall.token);

  const handleEndCall = async () => {
    try {
      // Call the end API
      await fetch(`/api/calls/${activeCall.callId}/end`, {
        method: "POST",
      });
    } catch (error) {
      console.error("Error ending call:", error);
    } finally {
      onCallEnd();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col">
      <LiveKitRoom
        serverUrl={activeCall.url}
        token={tokenString}
        connect={true}
        audio={true}
        video={activeCall.callType === "video"}
        onDisconnected={handleEndCall}
      >
        <RoomAudioRenderer />
        {activeCall.callType === "audio" ? (
          <AudioCallView
            otherParticipantName={activeCall.otherParticipantName}
            otherParticipantImage={activeCall.otherParticipantImage}
            onCallEnd={handleEndCall}
          />
        ) : (
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between bg-background/95 backdrop-blur">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleEndCall}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Avatar>
                  <AvatarImage src={activeCall.otherParticipantImage || undefined} />
                  <AvatarFallback>
                    {activeCall.otherParticipantName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{activeCall.otherParticipantName}</p>
                  <p className="text-sm text-muted-foreground">Video call</p>
                </div>
              </div>
              <CallControls onLeave={handleEndCall} callType="video" />
            </div>
            {/* Video content */}
            <div className="flex-1 min-h-0">
              <VideoCallView />
            </div>
          </div>
        )}
      </LiveKitRoom>
    </div>
  );
}

