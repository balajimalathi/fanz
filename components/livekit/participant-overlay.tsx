"use client";

import { useState } from "react";
import { useRemoteParticipants, useRoomContext } from "@livekit/components-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ParticipantOverlayProps {
  streamId: string;
  creatorId: string;
  currentUserId: string;
}

export function ParticipantOverlay({ streamId, creatorId, currentUserId }: ParticipantOverlayProps) {
  const remoteParticipants = useRemoteParticipants();
  const room = useRoomContext();
  const [kickingUserId, setKickingUserId] = useState<string | null>(null);

  const isCreator = currentUserId === creatorId;

  const handleKick = async (participantIdentity: string) => {
    if (!isCreator) return;

    setKickingUserId(participantIdentity);

    try {
      const response = await fetch(`/api/live/${streamId}/kick`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ participantIdentity }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to kick participant");
      }
    } catch (error) {
      console.error("Error kicking participant:", error);
      // Still remove from UI on error as the participant may have been disconnected
    } finally {
      setKickingUserId(null);
    }
  };

  // Filter out the creator from participants (creator is the broadcaster)
  const viewers = remoteParticipants.filter((p) => p.identity !== creatorId);

  if (viewers.length === 0) {
    return null;
  }

  return (
    <div className="absolute bottom-4 left-4 right-4 md:right-auto md:max-w-xs bg-black/70 backdrop-blur-sm rounded-lg p-4 border border-white/20">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">
          Viewers ({viewers.length})
        </h3>
      </div>
      <ScrollArea className="max-h-64">
        <div className="space-y-2">
          {viewers.map((participant) => {
            const displayName = participant.name || participant.identity || "Viewer";
            const initials = displayName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);

            return (
              <div
                key={participant.identity}
                className="flex items-center justify-between p-2 bg-white/10 rounded hover:bg-white/20 transition-colors"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-white/20 text-white">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-white truncate">{displayName}</span>
                </div>
                {isCreator && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-white hover:bg-red-500/20 hover:text-red-400"
                    onClick={() => handleKick(participant.identity)}
                    disabled={kickingUserId === participant.identity}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
