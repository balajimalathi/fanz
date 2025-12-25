"use client";

import { useEffect, useState } from "react";
import { MessageList } from "./message-list";
import { MessageInput } from "./message-input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useWebSocketContext } from "./websocket-provider";
import { WebSocketMessage } from "@/lib/websocket/types";
import { useSession } from "@/lib/auth/auth-client";

interface ChatWindowProps {
  conversationId: string;
  otherParticipant: {
    id: string;
    name: string;
    image?: string | null;
  };
}

export function ChatWindow({ conversationId, otherParticipant }: ChatWindowProps) {
  const { data: session } = useSession();
  const { send, on } = useWebSocketContext();
  const [senderInfo, setSenderInfo] = useState<Record<string, { name: string; image?: string | null }>>({});

  useEffect(() => {
    if (!session?.user) return;

    // Set current user info
    setSenderInfo((prev) => ({
      ...prev,
      [session.user.id]: {
        name: session.user.name || "You",
        image: session.user.image || null,
      },
    }));

    // Set other participant info
    setSenderInfo((prev) => ({
      ...prev,
      [otherParticipant.id]: {
        name: otherParticipant.name,
        image: otherParticipant.image || null,
      },
    }));
  }, [session, otherParticipant]);

  useEffect(() => {
    if (!on) return;

    // Listen for new messages
    const unsubscribe = on("message:send", (message: WebSocketMessage) => {
      if (message.type === "message:send" && message.payload.conversationId === conversationId) {
        // Refresh message list - could be optimized with local state update
        window.dispatchEvent(new CustomEvent("messageReceived", { detail: message }));
      }
    });

    return unsubscribe;
  }, [on, conversationId]);

  const handleMediaUpload = async (file: File, type: "image" | "audio" | "video"): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("conversationId", conversationId);
    formData.append("messageType", type);

    const response = await fetch("/api/chat/media", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Failed to upload media");
    }

    const data = await response.json();
    return data.mediaUrl;
  };

  const handleMarkAsRead = async (messageId: string) => {
    try {
      await fetch(`/api/chat/messages/${messageId}/read`, {
        method: "POST",
      });
    } catch (error) {
      console.error("Error marking message as read:", error);
    }
  };

  if (!session?.user) {
    return <div>Please log in to chat</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <MessageList
        conversationId={conversationId}
        currentUserId={session.user.id}
        senderInfo={senderInfo}
      />

      {/* Input */}
      <MessageInput
        conversationId={conversationId}
        onMediaUpload={handleMediaUpload}
      />
    </div>
  );
}

