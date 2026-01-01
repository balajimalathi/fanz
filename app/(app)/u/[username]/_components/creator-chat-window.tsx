"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChatInterface } from "@/components/livekit/chat-interface";
import { useCallState } from "@/components/livekit/call-state-provider";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, Video, ArrowLeft, X } from "lucide-react";
import { useSession } from "@/lib/auth/auth-client";

interface CreatorChatWindowProps {
  creatorId: string;
  creatorName: string;
  creatorImage?: string | null;
  username: string;
  onClose: () => void;
}

export function CreatorChatWindow({
  creatorId,
  creatorName,
  creatorImage,
  username,
  onClose,
}: CreatorChatWindowProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const { activeCall, setActiveCall } = useCallState();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication and get/create conversation
  useEffect(() => {
    const initializeChat = async () => {
      try {
        // Check if user is authenticated
        if (!session?.user) {
          setIsLoading(false);
          return;
        }

        setCurrentUserId(session.user.id);

        // Create or get existing conversation
        const response = await fetch("/api/conversations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            creatorId: creatorId,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to create/get conversation");
        }

        const conversation = await response.json();
        setConversationId(conversation.id);
      } catch (error) {
        console.error("Error initializing chat:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeChat();
  }, [creatorId, session]);

  const startCall = async (type: "audio" | "video") => {
    if (!conversationId || !currentUserId) return;

    try {
      const response = await fetch("/api/calls/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId,
          callType: type,
        }),
      });
 
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to initiate call");
      }

      const data = await response.json();
       
      console.log("[Creator Chat] API Response:", {
        token: data.token,
        tokenType: typeof data.token,
        isString: typeof data.token === "string",
        url: data.url,
        roomName: data.roomName,
      });

      // Ensure token is a string
      const tokenString = typeof data.token === "string" ? data.token : String(data.token);
      
      // Set active call for caller (they join immediately)
      setActiveCall({
        callId: data.call.id,
        conversationId: data.call.conversationId,
        otherParticipantId: creatorId,
        otherParticipantName: creatorName,
        otherParticipantImage: creatorImage || null,
        callType: type,
        token: tokenString,
        url: data.url,
        roomName: data.roomName,
      });
    } catch (error) {
      console.error("Error starting call:", error);
    }
  };

  const handleLogin = () => {
    router.push(`/login?redirect=/u/${username}`);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
          <p className="text-center mt-4 text-muted-foreground">Loading chat...</p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Start Chatting</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-muted-foreground mb-4">
            Please log in to start chatting with {creatorName}.
          </p>
          <div className="flex gap-2">
            <Button onClick={handleLogin} className="flex-1">
              Log In
            </Button>
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Note: Active calls are now handled globally by ActiveCallView component
  // This component only shows the chat interface

  if (!conversationId || !currentUserId) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Error</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-muted-foreground mb-4">
            Failed to initialize chat. Please try again.
          </p>
          <Button onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 sm:inset-auto sm:bottom-0 sm:right-0 z-50 w-full sm:w-96 sm:h-[700px] bg-background border-l border-t shadow-2xl flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between bg-background">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Avatar>
            <AvatarImage src={creatorImage || undefined} />
            <AvatarFallback>
              {creatorName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{creatorName}</p>
            <p className="text-sm text-muted-foreground">Online</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => startCall("audio")}
            disabled={!!activeCall}
          >
            <Phone className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => startCall("video")}
            disabled={!!activeCall}
          >
            <Video className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Chat interface */}
      <div className="flex-1 overflow-hidden">
        <ChatInterface
          conversationId={conversationId}
          currentUserId={currentUserId}
          otherUserName={creatorName}
          otherUserImage={creatorImage}
        />
      </div>
    </div>
  );
}

