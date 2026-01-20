"use client";

import { Users } from "lucide-react";
import { StreamTimer } from "./stream-timer";
import { useRemoteParticipants } from "@livekit/components-react";

interface ViewerStreamInfoProps {
  startedAt: string | Date | null;
  className?: string;
}

export function ViewerStreamInfo({ startedAt, className = "" }: ViewerStreamInfoProps) {
  const remoteParticipants = useRemoteParticipants();
  const participantCount = remoteParticipants.length;

  return (
    <div className={`flex items-center gap-2 md:gap-4 text-white ${className}`}>
      {startedAt && (
        <StreamTimer startedAt={startedAt} className="text-white" />
      )}
      
      <div className="flex items-center gap-1.5 md:gap-2">
        <Users className="h-3 w-3 md:h-4 md:w-4" />
        <span className="text-xs md:text-sm font-medium">
          {participantCount} {participantCount === 1 ? "viewer" : "viewers"}
        </span>
      </div>
    </div>
  );
}
