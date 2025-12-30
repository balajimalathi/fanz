"use client";

import { useEffect, useState } from "react";
import { Room } from "livekit-client";
import { getPresenceRoomName } from "@/lib/livekit/rooms";
import { getLiveKitUrl, createRoom } from "@/lib/livekit/client";
import { useSession } from "@/lib/auth/auth-client";

export function usePresence() {
  const { data: session } = useSession();
  const [isOnline, setIsOnline] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (!session?.user?.id) return;

    let presenceRoom: Room | null = null;

    const connectPresence = async () => {
      try {
        setIsConnecting(true);

        // Get token for presence room
        const tokenRes = await fetch("/api/livekit/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomType: "presence",
          }),
        });

        if (!tokenRes.ok) {
          throw new Error("Failed to get presence token");
        }

        const { token, roomName } = await tokenRes.json();

        // Create and connect to presence room
        presenceRoom = createRoom();
        await presenceRoom.connect(getLiveKitUrl(), token);

        setRoom(presenceRoom);
        setIsOnline(true);

        // Handle disconnection
        presenceRoom.on("disconnected", () => {
          setIsOnline(false);
          setRoom(null);
        });

        // Handle reconnection
        presenceRoom.on("reconnecting", () => {
          setIsOnline(false);
        });

        presenceRoom.on("reconnected", () => {
          setIsOnline(true);
        });
      } catch (error) {
        console.error("Error connecting to presence room:", error);
        setIsOnline(false);
      } finally {
        setIsConnecting(false);
      }
    };

    connectPresence();

    return () => {
      if (presenceRoom) {
        presenceRoom.disconnect();
      }
    };
  }, [session?.user?.id]);

  return { isOnline, room, isConnecting };
}

