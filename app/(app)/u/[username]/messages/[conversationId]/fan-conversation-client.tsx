"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import { ChatInterface } from "@/components/livekit/chat-interface";
import { CallControls } from "@/components/livekit/call-controls";
import { VideoCallView } from "@/components/livekit/video-call-view";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, Video, ArrowLeft } from "lucide-react";

interface FanConversationPageClientProps {
  conversationId: string;
  currentUserId: string;
  otherUserId: string;
  otherUserName: string;
  otherUserImage?: string | null;
}

export function FanConversationPageClient({
  conversationId,
  currentUserId,
  otherUserId,
  otherUserName,
  otherUserImage,
}: FanConversationPageClientProps) {
  const router = useRouter();
  const params = useParams();
  const username = params.username as string;
  const [token, setToken] = useState<string | null>(null);
  const [isInCall, setIsInCall] = useState(false);
  const [callType, setCallType] = useState<"audio" | "video" | null>(null);

  const startCall = async (type: "audio" | "video") => {
    try {
      const response = await fetch("/api/livekit/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ conversationId }),
      });

      if (!response.ok) throw new Error("Failed to get token");

      const data = await response.json();
      setToken(data.token);
      setCallType(type);
      setIsInCall(true);
    } catch (error) {
      console.error("Error starting call:", error);
    }
  };

  const endCall = () => {
    setIsInCall(false);
    setCallType(null);
    setToken(null);
  };

  if (isInCall && token) {
    const tokenString = typeof token === "string" ? token : String(token);
    const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || "";

    return (
      <LiveKitRoom
        serverUrl={livekitUrl}
        token={tokenString}
        connect={true}
        audio={true}
        video={callType === "video"}
        onDisconnected={endCall}
      >
        <RoomAudioRenderer />
        <div className="h-screen flex flex-col">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={otherUserImage || undefined} />
                <AvatarFallback>
                  {otherUserName.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{otherUserName}</p>
                <p className="text-sm text-muted-foreground">
                  {callType === "audio" ? "Audio call" : "Video call"}
                </p>
              </div>
            </div>
            <CallControls onLeave={endCall} callType={callType || "video"} />
          </div>
          <div className="flex-1">
            {callType === "video" ? <VideoCallView /> : null}
          </div>
        </div>
      </LiveKitRoom>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/u/${username}/messages`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Avatar>
            <AvatarImage src={otherUserImage || undefined} />
            <AvatarFallback>
              {otherUserName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{otherUserName}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => startCall("audio")}
          >
            <Phone className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => startCall("video")}
          >
            <Video className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Chat */}
      <ChatInterface
        conversationId={conversationId}
        currentUserId={currentUserId}
        otherUserName={otherUserName}
        otherUserImage={otherUserImage}
      />
    </div>
  );
}

