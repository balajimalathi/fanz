"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useRouter, useParams } from "next/navigation";

interface Conversation {
  id: string;
  otherUserId: string;
  otherUserName: string;
  otherUserImage: string | null;
  creatorDisplayName: string | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  createdAt: string;
  updatedAt: string;
}

interface MessagesListClientProps {
  fanId: string;
}

export function MessagesListClient({ fanId }: MessagesListClientProps) {
  const router = useRouter();
  const params = useParams();
  const username = params.username as string;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/conversations");
      if (!response.ok) throw new Error("Failed to fetch conversations");
      const data = await response.json();
      setConversations(data);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold">Messages</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {conversations.length} {conversations.length === 1 ? "conversation" : "conversations"}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <p>No conversations yet</p>
          </div>
        ) : (
          <div className="divide-y">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className="p-4 hover:bg-accent transition-colors cursor-pointer"
                onClick={() => router.push(`/u/${username}/messages/${conversation.id}`)}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12 flex-shrink-0">
                    <AvatarImage src={conversation.otherUserImage || undefined} />
                    <AvatarFallback>
                      {(conversation.creatorDisplayName || conversation.otherUserName)
                        .substring(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium truncate">
                        {conversation.creatorDisplayName || conversation.otherUserName}
                      </p>
                      {conversation.lastMessageAt && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatDistanceToNow(new Date(conversation.lastMessageAt), {
                            addSuffix: true,
                          })}
                        </span>
                      )}
                    </div>
                    {conversation.lastMessagePreview && (
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {conversation.lastMessagePreview}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

