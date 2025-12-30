"use client";

import { useEffect, useState, useCallback } from "react";
import { Room, DataPacket_Kind, RemoteParticipant, LocalParticipant } from "livekit-client";
import { getChatRoomName } from "@/lib/livekit/rooms";
import { getLiveKitUrl, createRoom, sendDataMessage } from "@/lib/livekit/client";

export interface ChatMessage {
  id: string;
  senderId: string;
  content: string;
  messageType: "text" | "image" | "audio";
  mediaUrl?: string;
  timestamp: Date;
}

export function useLiveKitChat(serviceOrderId: string | null) {
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    if (!serviceOrderId) return;

    try {
      setError(null);

      // Get token for chat room
      const tokenRes = await fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomType: "chat",
          serviceOrderId,
        }),
      });

      if (!tokenRes.ok) {
        const errorData = await tokenRes.json();
        throw new Error(errorData.error || "Failed to get chat token");
      }

      const { token, roomName } = await tokenRes.json();

      // Create and connect to chat room
      const chatRoom = createRoom();
      await chatRoom.connect(getLiveKitUrl(), token);

      setRoom(chatRoom);
      setIsConnected(true);

      // Listen for data messages
      chatRoom.on("dataReceived", (payload, participant) => {
        try {
          const data = JSON.parse(new TextDecoder().decode(payload));
          if (data.type === "message") {
            const message: ChatMessage = {
              id: data.id || Date.now().toString(),
              senderId: participant.identity,
              content: data.content,
              messageType: data.messageType || "text",
              mediaUrl: data.mediaUrl,
              timestamp: new Date(data.timestamp || Date.now()),
            };
            setMessages((prev) => [...prev, message]);
          }
        } catch (err) {
          console.error("Error parsing chat message:", err);
        }
      });

      // Handle disconnection
      chatRoom.on("disconnected", () => {
        setIsConnected(false);
        setRoom(null);
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to connect to chat";
      setError(errorMessage);
      setIsConnected(false);
    }
  }, [serviceOrderId]);

  const disconnect = useCallback(() => {
    if (room) {
      room.disconnect();
      setRoom(null);
      setIsConnected(false);
    }
  }, [room]);

  const sendMessage = useCallback(
    async (content: string, messageType: "text" | "image" | "audio" = "text", mediaUrl?: string) => {
      if (!room || !isConnected) {
        throw new Error("Not connected to chat");
      }

      try {
        // First persist message to database
        const conversationRes = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ serviceOrderId }),
        });

        if (!conversationRes.ok) {
          throw new Error("Failed to get conversation");
        }

        const conversation = await conversationRes.json();

        const messageRes = await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: conversation.id,
            messageType,
            content,
            mediaUrl,
          }),
        });

        if (!messageRes.ok) {
          throw new Error("Failed to save message");
        }

        const savedMessage = await messageRes.json();

        // Then send via LiveKit data channel
        const data = JSON.stringify({
          type: "message",
          id: savedMessage.id,
          content,
          messageType,
          mediaUrl,
          timestamp: new Date().toISOString(),
        });

        sendDataMessage(room, data, DataPacket_Kind.RELIABLE);

        // Add to local messages immediately
        const message: ChatMessage = {
          id: savedMessage.id,
          senderId: savedMessage.senderId,
          content: savedMessage.content || "",
          messageType: savedMessage.messageType,
          mediaUrl: savedMessage.mediaUrl || undefined,
          timestamp: new Date(savedMessage.createdAt),
        };
        setMessages((prev) => [...prev, message]);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to send message";
        throw new Error(errorMessage);
      }
    },
    [room, isConnected, serviceOrderId]
  );

  useEffect(() => {
    if (serviceOrderId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [serviceOrderId, connect, disconnect]);

  return {
    room,
    isConnected,
    messages,
    error,
    sendMessage,
    connect,
    disconnect,
  };
}

