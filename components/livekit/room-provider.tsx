"use client";

import React, { ReactNode, useEffect } from "react";
import { LiveKitRoom, useRoomContext } from "@livekit/components-react";

interface RoomProviderProps {
  children: ReactNode;
  token: string;
  url: string;
  roomName: string;
  onConnected?: (room: any) => void;
  onDisconnected?: () => void;
  onParticipantConnected?: (participant: any) => void;
  onParticipantDisconnected?: (participant: any) => void;
}

// Internal component to handle onConnected with room access
function RoomProviderContent({
  children,
  onConnected,
}: {
  children: ReactNode;
  onConnected?: (room: any) => void;
}) {
  const room = useRoomContext();
  const hasCalledRef = React.useRef(false);
  
  useEffect(() => {
    // Call onConnected when room is connected (only once)
    if (room && room.state === "connected" && onConnected && !hasCalledRef.current) {
      hasCalledRef.current = true;
      onConnected(room);
    }
    // Reset when room disconnects
    if (room && room.state === "disconnected") {
      hasCalledRef.current = false;
    }
  }, [room, onConnected]);

  return <>{children}</>;
}

export function RoomProvider({
  children,
  token,
  url,
  roomName,
  onConnected,
  onDisconnected,
  onParticipantConnected,
  onParticipantDisconnected,
}: RoomProviderProps) {
  // Ensure token is a string
  const tokenString = typeof token === "string" ? token : String(token);

  return (
    <LiveKitRoom
      serverUrl={url}
      token={tokenString}
      connect={true}
      audio={true}
      video={true}
      onDisconnected={onDisconnected}
    >
      <RoomProviderContent onConnected={onConnected}>
        {children}
      </RoomProviderContent>
    </LiveKitRoom>
  );
}

// Export useRoomContext hook from @livekit/components-react for backward compatibility
export { useRoomContext as useRoom } from "@livekit/components-react";
