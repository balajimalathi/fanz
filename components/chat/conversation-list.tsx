"use client";

import { useEffect, useState } from "react";
import { ConversationItem } from "./conversation-item";
import { Loader2 } from "lucide-react";

interface Conversation {
  id: string;
  otherParticipant: {
    id: string;
    name: string;
    image?: string | null;
    username?: string;
    role: "creator" | "fan";
  };
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
  isEnabled?: boolean;
  createdAt: string;
}

interface ConversationListProps {
  onSelectConversation: (conversationId: string) => void;
  selectedConversationId?: string;
}

export function ConversationList({
  onSelectConversation,
  selectedConversationId,
}: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/chat/conversations");
      if (!response.ok) throw new Error("Failed to fetch conversations");
      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>No conversations yet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {conversations.map((conversation) => (
        <ConversationItem
          key={conversation.id}
          id={conversation.id}
          otherParticipant={conversation.otherParticipant}
          lastMessageAt={conversation.lastMessageAt ? new Date(conversation.lastMessageAt) : null}
          lastMessagePreview={conversation.lastMessagePreview}
          unreadCount={conversation.unreadCount}
          isEnabled={conversation.isEnabled ?? true}
          onClick={() => onSelectConversation(conversation.id)}
          isActive={selectedConversationId === conversation.id}
        />
      ))}
    </div>
  );
}

