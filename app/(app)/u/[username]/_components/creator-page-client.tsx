"use client";

import { useState, useEffect } from "react";
import { CreatorChatWindow } from "./creator-chat-window";
import { useSession } from "@/lib/auth/auth-client";
import { CallGlobalWrapper } from "@/components/livekit/call-global-wrapper";
import { LiveViewerModal } from "@/components/livekit/live-viewer-modal";
import { LiveHandlerProvider } from "./live-handler-context";
import { FanOrdersModal } from "@/components/orders/fan-orders-modal";
import { ChatOrdersHandlerProvider } from "./chat-orders-handler-context";

interface CreatorPageClientProps {
  creatorId: string;
  creatorName: string;
  creatorImage?: string | null;
  username: string;
  chatEnabled?: boolean;
  callEnabled?: boolean;
  children: React.ReactNode;
}

export function CreatorPageClient({
  creatorId,
  creatorName,
  creatorImage,
  username,
  chatEnabled = true,
  callEnabled = true,
  children,
}: CreatorPageClientProps) {
  const [showChat, setShowChat] = useState(false);
  const [showLiveModal, setShowLiveModal] = useState(false);
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const [hasOrdersFromCreator, setHasOrdersFromCreator] = useState(false);
  const [liveStreamData, setLiveStreamData] = useState<{
    streamId: string;
    streamType: "free" | "follower_only" | "paid";
    price?: number | null;
  } | null>(null);
  const { data: session } = useSession();

  // Don't show chat button if user is the creator themselves
  const isCreator = session?.user?.id === creatorId;

  // Check if fan has orders from this creator
  useEffect(() => {
    const checkOrders = async () => {
      if (isCreator || !session?.user) {
        setHasOrdersFromCreator(false);
        return;
      }

      try {
        const response = await fetch(`/api/customer/orders?creatorId=${creatorId}`);
        if (response.ok) {
          const data = await response.json();
          setHasOrdersFromCreator((data.orders || []).length > 0);
        }
      } catch (error) {
        console.error("Error checking orders:", error);
        setHasOrdersFromCreator(false);
      }
    };

    checkOrders();
  }, [creatorId, isCreator, session?.user]);

  const handleLiveClick = (streamId: string, streamType: "free" | "follower_only" | "paid", price?: number | null) => {
    setLiveStreamData({ streamId, streamType, price });
    setShowLiveModal(true);
  };

  return (
    <LiveHandlerProvider onLiveClick={handleLiveClick}>
      <CallGlobalWrapper>
        <ChatOrdersHandlerProvider
          chatEnabled={chatEnabled}
          hasOrdersFromCreator={hasOrdersFromCreator}
          isCreator={isCreator}
          onChatClick={() => setShowChat(true)}
          onOrdersClick={() => setShowOrdersModal(true)}
        >
          {children}
        </ChatOrdersHandlerProvider>

      {/* Chat Window */}
      {showChat && (
        <CreatorChatWindow
          creatorId={creatorId}
          creatorName={creatorName}
          creatorImage={creatorImage}
          username={username}
          callEnabled={callEnabled}
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

      {/* Fan Orders Modal */}
      <FanOrdersModal
        open={showOrdersModal}
        onOpenChange={setShowOrdersModal}
        creatorId={creatorId}
        creatorName={creatorName}
      />
      </CallGlobalWrapper>
    </LiveHandlerProvider>
  );
}

