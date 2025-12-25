"use client";

import { useState, useRef } from "react";
import { Send, Image as ImageIcon, Video, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useWebSocketContext } from "./websocket-provider";

interface MessageInputProps {
  conversationId: string;
  isEnabled?: boolean;
  onMediaUpload?: (file: File, type: "image" | "audio" | "video") => Promise<string>;
}

export function MessageInput({ conversationId, isEnabled = true, onMediaUpload }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { send } = useWebSocketContext();

  const handleSend = async () => {
    if (!isEnabled) {
      alert("This chat is not enabled yet. Please wait for the creator to enable it.");
      return;
    }
    if (!message.trim() && !isSending) return;

    const messageContent = message.trim();
    setMessage("");
    setIsSending(true);

    try {
      send({
        type: "message:send",
        timestamp: Date.now(),
        payload: {
          conversationId,
          messageType: "text",
          content: messageContent,
        },
      });
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onMediaUpload) return;

    let type: "image" | "audio" | "video";
    if (file.type.startsWith("image/")) {
      type = "image";
    } else if (file.type.startsWith("audio/")) {
      type = "audio";
    } else if (file.type.startsWith("video/")) {
      type = "video";
    } else {
      return;
    }

    try {
      setIsSending(true);
      const mediaUrl = await onMediaUpload(file, type);

      send({
        type: "message:send",
        timestamp: Date.now(),
        payload: {
          conversationId,
          messageType: type,
          mediaUrl,
        },
      });
    } catch (error) {
      console.error("Error uploading media:", error);
    } finally {
      setIsSending(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="border-t p-4">
      <div className="flex items-end gap-2">
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending}
          >
            <ImageIcon className="h-5 w-5" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,audio/*,video/*"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Type a message..."
          className="min-h-[60px] max-h-[200px] resize-none"
          disabled={isSending || !isEnabled}
          placeholder={isEnabled ? "Type a message..." : "Chat is disabled"}
        />
        <Button onClick={handleSend} disabled={isSending || !message.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

