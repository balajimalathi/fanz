"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LiveKitRoom } from "@livekit/components-react";
import { LiveStreamView } from "@/components/livekit/live-stream-view";
import { LiveStreamComments } from "@/components/livekit/live-stream-comments";
import { LiveStreamControls } from "@/components/livekit/live-stream-controls";
import { Loader2 } from "lucide-react";
import { useSession } from "@/lib/auth/auth-client";
import { env } from "@/env";

function LivePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const streamId = searchParams.get("streamId");

  const [token, setToken] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStreamToken = async () => {
      if (!streamId || !session?.user) {
        setError("Stream ID or session missing");
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/live/${streamId}/token`);

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to get stream token");
        }

        const data = await response.json();
        setToken(data.token);
        setRoomName(data.roomName);
        setStartedAt(data.startedAt);
      } catch (err) {
        console.error("Error fetching stream token:", err);
        setError(err instanceof Error ? err.message : "Failed to load stream");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStreamToken();
  }, [streamId, session]);

  const handleEndStream = async () => {
    if (!streamId) return;

    try {
      const response = await fetch(`/api/live/${streamId}/end`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to end stream");
      }

      router.push("/home/inbox");
    } catch (err) {
      console.error("Error ending stream:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !token || !roomName || !startedAt) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-destructive mb-4">{error || "Failed to load stream"}</p>
          <button
            onClick={() => router.push("/home/inbox")}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-black overflow-hidden">
      <LiveKitRoom
        serverUrl={env.NEXT_PUBLIC_LIVEKIT_URL}
        token={token}
        connect={true}
        audio={true}
        video={true}
        onDisconnected={handleEndStream}
      >
        <div className="flex-1 flex overflow-hidden h-full">
          {/* Main Video Area (70%) */}
          <div className="flex-[0.7] relative bg-black overflow-hidden">
            <LiveStreamView isCreator={true} />
            <LiveStreamControls
              streamId={streamId!}
              onEndStream={handleEndStream}
              startedAt={startedAt}
            />
          </div>

          {/* Comment Sidebar (30%) */}
          <div className="flex-[0.3] border-l border-white/20 overflow-hidden flex flex-col min-h-0">
            <LiveStreamComments
              streamId={streamId!}
              creatorId={session?.user?.id || ""}
              currentUserId={session?.user?.id || ""}
              showKickButton={true}
            />
          </div>
        </div>
      </LiveKitRoom>
    </div>
  );
}

export default function LivePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    }>
      <LivePageContent />
    </Suspense>
  );
}