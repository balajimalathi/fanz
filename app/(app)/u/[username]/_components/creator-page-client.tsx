"use client";

import { useState } from "react";
import { CreatorChatWindow } from "./creator-chat-window";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { useSession } from "@/lib/auth/auth-client";

interface CreatorPageClientProps {
  creatorId: string;
  creatorName: string;
  creatorImage?: string | null;
  username: string;
  children: React.ReactNode;
}

export function CreatorPageClient({
  creatorId,
  creatorName,
  creatorImage,
  username,
  children,
}: CreatorPageClientProps) {
  const [showChat, setShowChat] = useState(false);
  const { data: session } = useSession();

  // Don't show chat button if user is the creator themselves
  const isCreator = session?.user?.id === creatorId;

  return (
    <>
      {children}
      
      {/* Floating Chat Button */}
      {!isCreator && (
        <div className="fixed bottom-4 right-4 z-40">
          <Button
            onClick={() => setShowChat(true)}
            size="lg"
            className="rounded-full shadow-lg h-14 w-14 p-0"
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
        </div>
      )}

      {/* Chat Window */}
      {showChat && (
        <CreatorChatWindow
          creatorId={creatorId}
          creatorName={creatorName}
          creatorImage={creatorImage}
          username={username}
          onClose={() => setShowChat(false)}
        />
      )}
    </>
  );
}

