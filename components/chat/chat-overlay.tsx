"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatWindow } from "./chat-window";
import { ConversationList } from "./conversation-list";
import { ChatHeader } from "./chat-header";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/auth/auth-client";

interface ChatOverlayProps {
  creatorId: string;
  creatorName: string;
  creatorImage?: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ChatOverlay({
  creatorId,
  creatorName,
  creatorImage,
  isOpen,
  onClose,
}: ChatOverlayProps) {
  const { data: session } = useSession();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "chat">("list");

  const [conversationInfo, setConversationInfo] = useState<{
    id: string;
    isEnabled: boolean;
  } | null>(null);

  // Create or get conversation when opening chat
  useEffect(() => {
    if (isOpen && view === "list" && !conversationId && session?.user) {
      createOrGetConversation();
    }
  }, [isOpen, view, conversationId, session?.user]);

  const createOrGetConversation = async () => {
    try {
      const response = await fetch("/api/chat/conversations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorId }),
      });

      if (!response.ok) {
        throw new Error("Failed to create conversation");
      }

      const data = await response.json();
      if (data.conversation) {
        setConversationId(data.conversation.id);
        setConversationInfo({
          id: data.conversation.id,
          isEnabled: data.conversation.isEnabled || false,
        });
        setView("chat");
      }
    } catch (error) {
      console.error("Error creating conversation:", error);
    }
  };

  // Fetch conversation details when conversationId changes
  useEffect(() => {
    if (conversationId && !conversationInfo) {
      fetchConversationDetails();
    }
  }, [conversationId]);

  const fetchConversationDetails = async () => {
    try {
      const response = await fetch(`/api/chat/conversations/${conversationId}`);
      if (response.ok) {
        const data = await response.json();
        setConversationInfo({
          id: conversationId,
          isEnabled: data.isEnabled || false,
        });
      }
    } catch (error) {
      console.error("Error fetching conversation details:", error);
    }
  };

  const handleBack = () => {
    if (view === "chat") {
      setView("list");
      setConversationId(null);
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 bg-background",
        "animate-in slide-in-from-bottom-full duration-300"
      )}
    >
      {/* Header */}
      {view === "chat" && conversationId ? (
        <ChatHeader
          otherParticipant={{
            id: creatorId,
            name: creatorName,
            image: creatorImage,
          }}
          onBack={handleBack}
        />
      ) : (
        <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
          <div className="flex items-center gap-3 p-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="h-9 w-9"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-lg font-semibold">Messages</h1>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="h-[calc(100vh-4rem)] overflow-hidden">
        {view === "list" ? (
          <ConversationList
            onSelectConversation={(id) => {
              setConversationId(id);
              setView("chat");
            }}
            selectedConversationId={conversationId || undefined}
          />
        ) : conversationId ? (
          conversationInfo && !conversationInfo.isEnabled ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center p-6 max-w-md">
                <div className="mb-4">
                  <div className="h-16 w-16 mx-auto rounded-full bg-muted flex items-center justify-center">
                    <MessageCircle className="h-8 w-8 text-muted-foreground" />
                  </div>
                </div>
                <p className="text-lg font-medium mb-2">Chat Not Enabled Yet</p>
                <p className="text-muted-foreground mb-4">
                  The creator needs to enable this chat before you can send messages.
                </p>
                <p className="text-sm text-muted-foreground">
                  You'll receive a notification when the chat is enabled.
                </p>
              </div>
            </div>
          ) : (
            <ChatWindow
              conversationId={conversationId}
              otherParticipant={{
                id: creatorId,
                name: creatorName,
                image: creatorImage,
              }}
              isEnabled={conversationInfo?.isEnabled ?? false}
            />
          )
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Loading conversation...</p>
          </div>
        )}
      </div>
    </div>
  );
}

