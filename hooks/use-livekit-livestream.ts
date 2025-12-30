"use client";

import { useEffect, useState, useCallback } from "react";
import { Room } from "livekit-client";
import { getLivestreamRoomName } from "@/lib/livekit/rooms";
import { getLiveKitUrl, createRoom } from "@/lib/livekit/client";

export function useLiveKitLivestream(creatorUsername: string | null) {
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    if (!creatorUsername) return;

    try {
      setError(null);

      // Get token for livestream room
      const tokenRes = await fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomType: "livestream",
          creatorUsername,
        }),
      });

      if (!tokenRes.ok) {
        const errorData = await tokenRes.json();
        throw new Error(errorData.error || "Failed to get livestream token");
      }

      const { token } = await tokenRes.json();

      // Create and connect to livestream room (subscriber only)
      const streamRoom = createRoom();
      await streamRoom.connect(getLiveKitUrl(), token, {
        autoSubscribe: true,
      });

      setRoom(streamRoom);
      setIsConnected(true);

      // Handle disconnection
      streamRoom.on("disconnected", () => {
        setIsConnected(false);
        setRoom(null);
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to connect to livestream";
      setError(errorMessage);
      setIsConnected(false);
    }
  }, [creatorUsername]);

  const disconnect = useCallback(() => {
    if (room) {
      room.disconnect();
      setRoom(null);
      setIsConnected(false);
    }
  }, [room]);

  useEffect(() => {
    if (creatorUsername) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [creatorUsername, connect, disconnect]);

  return {
    room,
    isConnected,
    error,
    connect,
    disconnect,
  };
}

