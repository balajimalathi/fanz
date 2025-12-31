"use client";

"use client";

import { ReactNode, useEffect, useState, createContext, useContext } from "react";
import { Room, RoomEvent, RemoteParticipant } from "livekit-client";

interface RoomContextType {
  room: Room | null;
  isConnected: boolean;
  error: Error | null;
}

const RoomContext = createContext<RoomContextType>({
  room: null,
  isConnected: false,
  error: null,
});

export function useRoom() {
  return useContext(RoomContext);
}

interface RoomProviderProps {
  children: ReactNode;
  token: string;
  url: string;
  roomName: string;
  onConnected?: (room: Room) => void;
  onDisconnected?: () => void;
  onParticipantConnected?: (participant: RemoteParticipant) => void;
  onParticipantDisconnected?: (participant: RemoteParticipant) => void;
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
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!token || !url || !roomName) {
      return;
    }

    const connectRoom = async () => {
      try {
        const newRoom = new Room();
        
        // Set up event listeners
        newRoom.on(RoomEvent.Connected, () => {
          setIsConnected(true);
          onConnected?.(newRoom);
        });

        newRoom.on(RoomEvent.Disconnected, () => {
          setIsConnected(false);
          onDisconnected?.();
        });

        newRoom.on(RoomEvent.ParticipantConnected, (participant) => {
          if (participant instanceof RemoteParticipant) {
            onParticipantConnected?.(participant);
          }
        });

        newRoom.on(RoomEvent.ParticipantDisconnected, (participant) => {
          if (participant instanceof RemoteParticipant) {
            onParticipantDisconnected?.(participant);
          }
        });

        // Connect to room
        await newRoom.connect(url, token);
        setRoom(newRoom);
      } catch (err) {
        console.error("Error connecting to room:", err);
        setError(err as Error);
      }
    };

    connectRoom();

    return () => {
      if (room) {
        room.disconnect();
      }
    };
  }, [token, url, roomName]);

  return (
    <RoomContext.Provider value={{ room, isConnected, error }}>
      {children}
    </RoomContext.Provider>
  );
}
