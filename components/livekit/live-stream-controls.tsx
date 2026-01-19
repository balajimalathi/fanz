"use client";

import { useState, useEffect, useRef } from "react";
import { useRoomContext, useLocalParticipant, useRemoteParticipants } from "@livekit/components-react";
import { Track } from "livekit-client";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Users } from "lucide-react";
import { PriceDisplay } from "@/components/currency/price-display";
import { toSubunits } from "@/lib/currency/currency-utils";
import { StreamTimer } from "./stream-timer";

interface LiveStreamControlsProps {
  streamId: string;
  onEndStream: () => void;
  currency?: string;
  startedAt?: string | Date | null;
}

export function LiveStreamControls({
  streamId,
  onEndStream,
  currency = "USD",
  startedAt,
}: LiveStreamControlsProps) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [totalCollection, setTotalCollection] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Get participant count (excluding creator)
  const participantCount = remoteParticipants.length;

  // Set up SSE connection for collection updates
  useEffect(() => {
    if (!streamId) return;

    const eventSource = new EventSource(`/api/live/${streamId}/collection/stream`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log("[LiveStreamControls] SSE connection opened");
    };

    eventSource.addEventListener("collection_update", (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.total !== undefined) {
          setTotalCollection(data.total);
        }
      } catch (error) {
        console.error("Error parsing collection update:", error);
      }
    });

    eventSource.onerror = (error) => {
      console.error("[LiveStreamControls] SSE error:", error);
      // SSE will auto-reconnect
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [streamId]);

  // Toggle audio mute
  const toggleAudio = async () => {
    if (!localParticipant) return;

    const audioTrack = Array.from(localParticipant.audioTrackPublications.values())
      .find((pub) => pub.track !== null)?.track;

    if (audioTrack) {
      if (isAudioMuted) {
        await localParticipant.setMicrophoneEnabled(true);
        setIsAudioMuted(false);
      } else {
        await localParticipant.setMicrophoneEnabled(false);
        setIsAudioMuted(true);
      }
    }
  };

  // Toggle video mute
  const toggleVideo = async () => {
    if (!localParticipant) return;

    const videoTrack = Array.from(localParticipant.videoTrackPublications.values())
      .find((pub) => pub.track !== null)?.track;

    if (videoTrack) {
      if (isVideoMuted) {
        await localParticipant.setCameraEnabled(true);
        setIsVideoMuted(false);
      } else {
        await localParticipant.setCameraEnabled(false);
        setIsVideoMuted(true);
      }
    }
  };

  // Check initial mute state
  useEffect(() => {
    if (!localParticipant) return;

    const checkMuteState = () => {
      const audioTrack = Array.from(localParticipant.audioTrackPublications.values())
        .find((pub) => pub.track !== null)?.track;
      const videoTrack = Array.from(localParticipant.videoTrackPublications.values())
        .find((pub) => pub.track !== null)?.track;

      setIsAudioMuted(!audioTrack || !audioTrack.isMuted === false);
      setIsVideoMuted(!videoTrack || !videoTrack.isMuted === false);
    };

    checkMuteState();

    const handleTrackPublished = () => checkMuteState();
    const handleTrackUnpublished = () => checkMuteState();

    localParticipant.on("localTrackPublished", handleTrackPublished);
    localParticipant.on("localTrackUnpublished", handleTrackUnpublished);

    return () => {
      localParticipant.off("localTrackPublished", handleTrackPublished);
      localParticipant.off("localTrackUnpublished", handleTrackUnpublished);
    };
  }, [localParticipant]);

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm border-t border-white/20 p-4 z-10">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Left side - Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant={isAudioMuted ? "destructive" : "secondary"}
            size="icon"
            onClick={toggleAudio}
            className="h-10 w-10"
            title={isAudioMuted ? "Unmute audio" : "Mute audio"}
          >
            {isAudioMuted ? (
              <MicOff className="h-5 w-5" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </Button>

          <Button
            variant={isVideoMuted ? "destructive" : "secondary"}
            size="icon"
            onClick={toggleVideo}
            className="h-10 w-10"
            title={isVideoMuted ? "Turn on video" : "Turn off video"}
          >
            {isVideoMuted ? (
              <VideoOff className="h-5 w-5" />
            ) : (
              <Video className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Center - Stats */}
        <div className="flex items-center gap-6 text-white">
          {startedAt && (
            <StreamTimer startedAt={startedAt} className="text-white" />
          )}
          
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="text-sm font-medium">
              {participantCount} {participantCount === 1 ? "viewer" : "viewers"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Collection:</span>
            <span className="text-sm font-bold">
              <PriceDisplay
                amount={toSubunits(totalCollection, currency)}
                originalCurrency={currency}
              />
            </span>
          </div>
        </div>

        {/* Right side - End Stream */}
        <Button
          variant="destructive"
          onClick={onEndStream}
          className="h-10"
        >
          <PhoneOff className="h-4 w-4 mr-2" />
          End Stream
        </Button>
      </div>
    </div>
  );
}
