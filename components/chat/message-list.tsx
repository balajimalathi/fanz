"use client";

import { useEffect, useRef, useState } from "react";
import { MessageBubble } from "./message-bubble";
import { TypingIndicator } from "./typing-indicator";
import { Loader2 } from "lucide-react";

interface Message {
  id: string;
  senderId: string;
  messageType: "text" | "image" | "audio" | "video";
  content?: string | null;
  mediaUrl?: string | null;
  thumbnailUrl?: string | null;
  readAt: string | null;
  createdAt: string;
}

interface MessageListProps {
  conversationId: string;
  currentUserId: string;
  senderInfo: Record<string, { name: string; image?: string | null }>;
  isOtherUserTyping?: boolean;
  otherUserName?: string;
}

export function MessageList({
  conversationId,
  currentUserId,
  senderInfo,
  isOtherUserTyping = false,
  otherUserName = "Someone",
}: MessageListProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
  }, [conversationId]);

  const fetchMessages = async (cursor?: string | null) => {
    try {
      setIsLoading(true);
      const url = cursor
        ? `/api/chat/conversations/${conversationId}/messages?cursor=${cursor}`
        : `/api/chat/conversations/${conversationId}/messages`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch messages");
      const data = await response.json();

      if (cursor) {
        setMessages((prev) => [...data.messages, ...prev]);
      } else {
        setMessages(data.messages);
      }

      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMore = () => {
    if (hasMore && nextCursor && !isLoading) {
      fetchMessages(nextCursor);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Listen for new messages via custom event (dispatched from chat-window)
  useEffect(() => {
    console.log(`[MESSAGE-LIST] Setting up messageReceived listener for conversation ${conversationId}`);
    const handleMessageReceived = (event: CustomEvent) => {
      const message = event.detail;
      console.log(`[MESSAGE-LIST] Received messageReceived event:`, message);
      if (message.type === "message:send" && message.payload.conversationId === conversationId) {
        console.log(`[MESSAGE-LIST] Fetching messages for conversation ${conversationId}`);
        // Fetch the latest messages to get the new message with full details
        fetchMessages();
      } else {
        console.log(`[MESSAGE-LIST] Message ignored - type: ${message.type}, conversationId: ${message.payload?.conversationId}`);
      }
    };

    window.addEventListener("messageReceived", handleMessageReceived as EventListener);
    console.log(`[MESSAGE-LIST] Listener registered`);
    return () => {
      window.removeEventListener("messageReceived", handleMessageReceived as EventListener);
      console.log(`[MESSAGE-LIST] Listener removed`);
    };
  }, [conversationId]);

  if (isLoading && messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      className="flex-1 overflow-y-auto min-h-0 p-3 sm:p-4"
      onScroll={(e) => {
        const target = e.target as HTMLDivElement;
        if (target.scrollTop === 0 && hasMore) {
          loadMore();
        }
      }}
    >
      {hasMore && (
        <div className="flex justify-center py-2">
          <button
            onClick={loadMore}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Load older messages
          </button>
        </div>
      )}
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          id={message.id}
          senderId={message.senderId}
          currentUserId={currentUserId}
          messageType={message.messageType}
          content={message.content}
          mediaUrl={message.mediaUrl}
          thumbnailUrl={message.thumbnailUrl}
          readAt={message.readAt ? new Date(message.readAt) : null}
          createdAt={new Date(message.createdAt)}
          senderName={senderInfo[message.senderId]?.name || "Unknown"}
          senderImage={senderInfo[message.senderId]?.image}
        />
      ))}
      {isOtherUserTyping && <TypingIndicator userName={otherUserName} />}
      <div ref={messagesEndRef} />
    </div>
  );
}

