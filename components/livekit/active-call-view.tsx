"use client";

import { useEffect, useRef } from "react";
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
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Send heartbeat every 30 seconds when call is active
  useEffect(() => {
    if (!activeCall.callId) return;

    const sendHeartbeat = async () => {
      try {
        const response = await fetch(`/api/calls/${activeCall.callId}/heartbeat`, {
          method: "POST",
        });

        if (!response.ok) {
          const data = await response.json();
          
          // If should cutoff (insufficient balance), end the call
          if (response.status === 402 || data.shouldCutoff) {
            console.log("[Call Heartbeat] Insufficient balance, ending call");
            handleEndCall();
            return;
          }
        } else {
          const data = await response.json();
          // Update balance display if needed (can be added later)
          if (data.remainingBalance !== undefined) {
            // Balance updated, could trigger a UI update
          }
        }
      } catch (error) {
        console.error("[Call Heartbeat] Error sending heartbeat:", error);
      }
    };

    // Send first heartbeat immediately, then every 30 seconds
    sendHeartbeat();
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, 30000);

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };
  }, [activeCall.callId]);

  const handleEndCall = async () => {
    // Clear heartbeat interval
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

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

