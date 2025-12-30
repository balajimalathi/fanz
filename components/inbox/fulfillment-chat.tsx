"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLiveKitChat, type ChatMessage } from "@/hooks/use-livekit-chat";
import { useConversation } from "@/hooks/use-conversation";
import { Send, Image as ImageIcon, Mic } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSession } from "@/lib/auth/auth-client";
import { formatDistanceToNow } from "date-fns";

interface FulfillmentChatProps {
  serviceOrderId: string;
}

export function FulfillmentChat({ serviceOrderId }: FulfillmentChatProps) {
  const { data: session } = useSession();
  const [message, setMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { conversation } = useConversation(serviceOrderId);
  const { messages, sendMessage, isConnected, error } = useLiveKitChat(serviceOrderId);

  // Load message history
  const [messageHistory, setMessageHistory] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (!conversation) return;

    const loadHistory = async () => {
      try {
        const res = await fetch(`/api/messages?conversationId=${conversation.id}`);
        if (res.ok) {
          const history = await res.json();
          setMessageHistory(history);
        }
      } catch (error) {
        console.error("Error loading message history:", error);
      }
    };

    loadHistory();
  }, [conversation]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, messageHistory]);

  const handleSend = async () => {
    if (!message.trim() || !isConnected) return;

    try {
      await sendMessage(message, "text");
      setMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("messageType", "image");

      const uploadRes = await fetch("/api/messages/media", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) throw new Error("Upload failed");

      const { url } = await uploadRes.json();
      await sendMessage("", "image", url);
    } catch (error) {
      console.error("Error uploading image:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const allMessages = [...messageHistory, ...messages].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {allMessages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No messages yet. Start the conversation!
            </div>
          ) : (
            allMessages.map((msg) => {
              const isOwn = msg.senderId === session?.user?.id;
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isOwn ? "flex-row-reverse" : ""}`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {isOwn ? "You" : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
                    <div
                      className={`rounded-lg px-3 py-2 max-w-[80%] ${
                        isOwn
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      {msg.messageType === "image" && msg.mediaUrl ? (
                        <img
                          src={msg.mediaUrl}
                          alt="Message image"
                          className="max-w-full h-auto rounded"
                        />
                      ) : (
                        <p className="text-sm">{msg.content}</p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(msg.timestamp, { addSuffix: true })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {error && (
        <div className="px-4 py-2 text-sm text-destructive bg-destructive/10">
          {error}
        </div>
      )}

      <div className="border-t p-4">
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a message..."
            disabled={!isConnected || isUploading}
          />
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            id="image-upload"
            disabled={!isConnected || isUploading}
          />
          <label htmlFor="image-upload">
            <Button variant="outline" size="icon" disabled={!isConnected || isUploading} asChild>
              <span>
                <ImageIcon className="h-4 w-4" />
              </span>
            </Button>
          </label>
          <Button
            onClick={handleSend}
            disabled={!message.trim() || !isConnected || isUploading}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

