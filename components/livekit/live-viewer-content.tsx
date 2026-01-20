"use client";

import { useState } from "react";
import { useRoomContext, useLocalParticipant } from "@livekit/components-react";
import { DataPacket_Kind } from "livekit-client";
import { LiveStreamView } from "./live-stream-view";
import { LiveStreamComments } from "./live-stream-comments";
import { ViewerStreamInfo } from "./viewer-stream-info";
import { LiveStreamTipModal } from "./live-stream-tip-modal";
import { useSession } from "@/lib/auth/auth-client";

interface LiveViewerContentProps {
  streamId: string;
  creatorId: string;
  startedAt: string | null;
  showTipModal: boolean;
  setShowTipModal: (show: boolean) => void;
}

export function LiveViewerContent({
  streamId,
  creatorId,
  startedAt,
  showTipModal,
  setShowTipModal,
}: LiveViewerContentProps) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const { data: session } = useSession();

  const handleTipSent = async (coins: number) => {
    // Send tip notification via data channel
    if (room && localParticipant) {
      try {
        const tipNotification = {
          type: "tip",
          userId: session?.user?.id || "user",
          userName: session?.user?.name || session?.user?.email || "User",
          coins: coins,
          timestamp: Date.now(),
        };

        const encoder = new TextEncoder();
        const tipData = encoder.encode(JSON.stringify(tipNotification));
        await localParticipant.publishData(tipData, { reliable: true });
      } catch (error) {
        console.error("Error sending tip notification:", error);
      }
    }
  };

  return (
    <>
      {/* Mobile: Stack vertically, Desktop: Side by side */}
      <div className="flex flex-col md:flex-row h-full overflow-hidden">
        {/* Main Video Area - Full width on mobile, 70% on desktop */}
        <div className="flex-1 md:flex-[0.7] relative bg-black overflow-hidden w-full md:w-auto min-h-0">
          {/* Stream Info - Smaller on mobile */}
          {startedAt && (
            <div className="absolute top-2 left-2 md:top-4 md:left-4 z-10 bg-black/70 backdrop-blur-sm rounded-lg px-2 py-1.5 md:px-3 md:py-2 border border-white/20">
              <ViewerStreamInfo startedAt={startedAt} />
            </div>
          )}
          <LiveStreamView isCreator={false} />
        </div>

        {/* Comment Sidebar - Full width on mobile (40vh), 30% on desktop */}
        <div className="h-[40vh] md:h-auto md:flex-[0.3] border-t md:border-t-0 md:border-l border-white/20 flex flex-col w-full md:w-auto shrink-0">
          <LiveStreamComments
            streamId={streamId}
            creatorId={creatorId}
            currentUserId={session?.user?.id || ""}
            showKickButton={false}
            showTipButton={true}
            onTipClick={() => setShowTipModal(true)}
          />
        </div>
      </div>

      {showTipModal && (
        <LiveStreamTipModal
          open={showTipModal}
          onOpenChange={setShowTipModal}
          streamId={streamId}
          creatorId={creatorId}
          creatorName="Creator"
          onTipSent={handleTipSent}
        />
      )}
    </>
  );
}
