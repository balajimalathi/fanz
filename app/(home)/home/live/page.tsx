"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LiveKitRoom } from "@livekit/components-react";
import { LiveStreamView } from "@/components/livekit/live-stream-view";
import { ParticipantOverlay } from "@/components/livekit/participant-overlay";
import { Button } from "@/components/ui/button";
import { Loader2, PhoneOff } from "lucide-react";
import { useSession } from "@/lib/auth/auth-client";
import { env } from "@/env";

function LivePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const streamId = searchParams.get("streamId");

  const [token, setToken] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string | null>(null);
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

  if (error || !token || !roomName) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-destructive mb-4">{error || "Failed to load stream"}</p>
          <Button onClick={() => router.push("/home/inbox")}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-black">
      <LiveKitRoom
        serverUrl={env.NEXT_PUBLIC_LIVEKIT_URL}
        token={token}
        connect={true}
        audio={true}
        video={true}
        onDisconnected={handleEndStream}
      >
        <div className="flex-1 relative">
          <LiveStreamView isCreator={true} />
          <ParticipantOverlay
            streamId={streamId!}
            creatorId={session?.user?.id || ""}
            currentUserId={session?.user?.id || ""}
          />
        </div>

        {/* Controls */}
        <div className="absolute top-4 right-4 z-10">
          <Button
            variant="destructive"
            onClick={handleEndStream}
            className="shadow-lg"
          >
            <PhoneOff className="h-4 w-4 mr-2" />
            End Stream
          </Button>
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