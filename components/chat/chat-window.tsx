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
  isEnabled?: boolean;
}

export function ChatWindow({ conversationId, otherParticipant, isEnabled = true }: ChatWindowProps) {
  const { data: session } = useSession();
  const { send, on } = useWebSocketContext();
  const [senderInfo, setSenderInfo] = useState<Record<string, { name: string; image?: string | null }>>({});
  const [conversationEnabled, setConversationEnabled] = useState(isEnabled);

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
    if (!on) {
      console.log("[CHAT-WINDOW] on() is not available");
      return;
    }

    console.log(`[CHAT-WINDOW] Setting up listener for conversation ${conversationId}`);
    // Listen for new messages
    const unsubscribe = on("message:send", (message: WebSocketMessage) => {
      console.log(`[CHAT-WINDOW] Received message:send event:`, message);
      console.log(`[CHAT-WINDOW] Message conversationId: ${message.payload?.conversationId}, current: ${conversationId}`);
      if (message.type === "message:send" && message.payload.conversationId === conversationId) {
        console.log(`[CHAT-WINDOW] Dispatching messageReceived event for conversation ${conversationId}`);
        // Refresh message list - could be optimized with local state update
        window.dispatchEvent(new CustomEvent("messageReceived", { detail: message }));
      } else {
        console.log(`[CHAT-WINDOW] Message ignored - conversationId mismatch or wrong type`);
      }
    });

    console.log(`[CHAT-WINDOW] Listener registered for conversation ${conversationId}`);
    return unsubscribe;
  }, [on, conversationId]);

  // Fetch conversation status and poll for updates
  useEffect(() => {
    if (!conversationId) return;

    const fetchConversationStatus = async () => {
      try {
        const response = await fetch(`/api/chat/conversations/${conversationId}`);
        if (response.ok) {
          const data = await response.json();
          const newEnabled = data.isEnabled || false;
          setConversationEnabled(newEnabled);
          // If just enabled, trigger refresh
          if (newEnabled && !conversationEnabled) {
            window.dispatchEvent(new CustomEvent("conversationEnabled"));
          }
        }
      } catch (error) {
        console.error("Error fetching conversation status:", error);
      }
    };

    fetchConversationStatus();
    
    // Poll for status updates if disabled (every 5 seconds)
    if (!conversationEnabled) {
      const interval = setInterval(() => {
        fetchConversationStatus();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [conversationId, conversationEnabled]);

  const fetchConversationStatus = async () => {
    try {
      const response = await fetch(`/api/chat/conversations/${conversationId}`);
      if (response.ok) {
        const data = await response.json();
        const newEnabled = data.isEnabled || false;
        setConversationEnabled(newEnabled);
        // If just enabled, trigger refresh
        if (newEnabled && !conversationEnabled) {
          window.dispatchEvent(new CustomEvent("conversationEnabled"));
        }
      }
    } catch (error) {
      console.error("Error fetching conversation status:", error);
    }
  };

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
        isEnabled={conversationEnabled}
        onMediaUpload={handleMediaUpload}
      />
    </div>
  );
}

