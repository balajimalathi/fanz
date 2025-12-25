"use client";

import { useState } from "react";
import { ChatOverlay } from "@/components/chat/chat-overlay";
import { useSession } from "@/lib/auth/auth-client";
import { ChatProvider, useChatContext } from "@/lib/chat/chat-context";

interface ChatPageWrapperProps {
  children: React.ReactNode;
  creatorId: string;
  creatorName: string;
  creatorImage?: string | null;
}

export function ChatPageWrapper({
  children,
  creatorId,
  creatorName,
  creatorImage,
}: ChatPageWrapperProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { data: session } = useSession();

  const handleOpenChat = () => {
    if (!session?.user) {
      // Redirect to login if not authenticated
      window.location.href = "/login";
      return;
    }
    setIsChatOpen(true);
  };

  return (
    <ChatProvider onOpenChat={handleOpenChat} isChatOpen={isChatOpen}>
      <div style={{ display: isChatOpen ? "none" : "block" }}>{children}</div>
      {session?.user && (
        <ChatOverlay
          creatorId={creatorId}
          creatorName={creatorName}
          creatorImage={creatorImage}
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
        />
      )}
    </ChatProvider>
  );
}

