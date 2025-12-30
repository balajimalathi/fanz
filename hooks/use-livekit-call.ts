"use client";

import { useEffect, useState, useCallback } from "react";
import { Room, Track } from "livekit-client";
import { getCallRoomName } from "@/lib/livekit/rooms";
import { getLiveKitUrl, createRoom } from "@/lib/livekit/client";

export type CallType = "audio" | "video";

export function useLiveKitCall(serviceOrderId: string | null, callType: CallType = "audio") {
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === "video");
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    if (!serviceOrderId) return;

    try {
      setError(null);

      // Get token for call room
      const tokenRes = await fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomType: "call",
          serviceOrderId,
        }),
      });

      if (!tokenRes.ok) {
        const errorData = await tokenRes.json();
        throw new Error(errorData.error || "Failed to get call token");
      }

      const { token } = await tokenRes.json();

      // Create and connect to call room
      const callRoom = createRoom();
      await callRoom.connect(getLiveKitUrl(), token, {
        autoSubscribe: true,
      });

      // Enable audio/video tracks
      if (callType === "video") {
        await callRoom.localParticipant.setCameraEnabled(true);
      }
      await callRoom.localParticipant.setMicrophoneEnabled(true);

      setRoom(callRoom);
      setIsConnected(true);
      setIsMuted(false);
      setIsVideoEnabled(callType === "video");

      // Handle disconnection
      callRoom.on("disconnected", () => {
        setIsConnected(false);
        setRoom(null);
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to connect to call";
      setError(errorMessage);
      setIsConnected(false);
    }
  }, [serviceOrderId, callType]);

  const disconnect = useCallback(() => {
    if (room) {
      room.disconnect();
      setRoom(null);
      setIsConnected(false);
    }
  }, [room]);

  const toggleMute = useCallback(async () => {
    if (!room) return;

    try {
      const isCurrentlyMuted = room.localParticipant.isMicrophoneEnabled;
      await room.localParticipant.setMicrophoneEnabled(!isCurrentlyMuted);
      setIsMuted(!isCurrentlyMuted);
    } catch (err) {
      console.error("Error toggling mute:", err);
    }
  }, [room]);

  const toggleVideo = useCallback(async () => {
    if (!room) return;

    try {
      const isCurrentlyEnabled = room.localParticipant.isCameraEnabled;
      await room.localParticipant.setCameraEnabled(!isCurrentlyEnabled);
      setIsVideoEnabled(!isCurrentlyEnabled);
    } catch (err) {
      console.error("Error toggling video:", err);
    }
  }, [room]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    room,
    isConnected,
    isMuted,
    isVideoEnabled,
    error,
    connect,
    disconnect,
    toggleMute,
    toggleVideo,
  };
}

