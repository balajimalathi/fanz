"use client";

import { useState } from "react";
import { CreatorChatWindow } from "./creator-chat-window";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { useSession } from "@/lib/auth/auth-client";
import { CallGlobalWrapper } from "@/components/livekit/call-global-wrapper";
import { LiveViewerModal } from "@/components/livekit/live-viewer-modal";
import { LiveHandlerProvider } from "./live-handler-context";

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
  const [showLiveModal, setShowLiveModal] = useState(false);
  const [liveStreamData, setLiveStreamData] = useState<{
    streamId: string;
    streamType: "free" | "follower_only" | "paid";
    price?: number | null;
  } | null>(null);
  const { data: session } = useSession();

  // Don't show chat button if user is the creator themselves
  const isCreator = session?.user?.id === creatorId;

  const handleLiveClick = (streamId: string, streamType: "free" | "follower_only" | "paid", price?: number | null) => {
    setLiveStreamData({ streamId, streamType, price });
    setShowLiveModal(true);
  };

  return (
    <LiveHandlerProvider onLiveClick={handleLiveClick}>
      <CallGlobalWrapper>
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

      {/* Live Viewer Modal */}
      {showLiveModal && liveStreamData && (
        <LiveViewerModal
          open={showLiveModal}
          onOpenChange={setShowLiveModal}
          streamId={liveStreamData.streamId}
          creatorId={creatorId}
          streamType={liveStreamData.streamType}
          price={liveStreamData.price}
        />
      )}
      </CallGlobalWrapper>
    </LiveHandlerProvider>
  );
}

