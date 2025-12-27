"use client";

import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { OnlineStatusIndicator } from "./online-status-indicator";
import { useWebSocketContext } from "./websocket-provider";
import { WebSocketMessage } from "@/lib/websocket/types";

interface ChatHeaderProps {
  otherParticipant: {
    id: string;
    name: string;
    image?: string | null;
  };
  onBack: () => void;
}

export function ChatHeader({ otherParticipant, onBack }: ChatHeaderProps) {
  const [otherUserOnline, setOtherUserOnline] = useState(false);
  const { on } = useWebSocketContext();

  // Check online status of other participant
  useEffect(() => {
    // Initial state fetch (one-time)
    const fetchInitial = async () => {
      try {
        const response = await fetch(`/api/users/${otherParticipant.id}/online-status`);
        if (response.ok) {
          const data = await response.json();
          setOtherUserOnline(data.online || false);
        }
      } catch (error) {
        console.error("Error checking online status:", error);
        setOtherUserOnline(false);
      }
    };

    fetchInitial();

    // Listen to real-time Socket.IO events
    const unsubscribeOnline = on("presence:online", (message: WebSocketMessage) => {
      if (message.type === "presence:online" && "payload" in message) {
        const payload = message.payload as { userId: string };
        if (payload.userId === otherParticipant.id) {
          setOtherUserOnline(true);
        }
      }
    });

    const unsubscribeOffline = on("presence:offline", (message: WebSocketMessage) => {
      if (message.type === "presence:offline" && "payload" in message) {
        const payload = message.payload as { userId: string };
        if (payload.userId === otherParticipant.id) {
          setOtherUserOnline(false);
        }
      }
    });

    return () => {
      unsubscribeOnline();
      unsubscribeOffline();
    };
  }, [otherParticipant.id, on]);

  return (
    <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="flex items-center gap-3 p-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="h-9 w-9"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="relative inline-block">
          <Avatar className="h-8 w-8">
            <AvatarImage src={otherParticipant.image || undefined} alt={otherParticipant.name} />
            <AvatarFallback>
              {otherParticipant.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <OnlineStatusIndicator userId={otherParticipant.id} size="sm" className="bottom-0 right-0" />
        </div>
        <div className="flex-1">
          <p className="font-medium">{otherParticipant.name}</p>
          {otherUserOnline && (
            <p className="text-xs text-muted-foreground">Online</p>
          )}
        </div>
      </div>
    </div>
  );
}

