"use client";

import { useEffect, useRef } from "react";
import { useRoomContext, useLocalParticipant, useRemoteParticipants, RoomAudioRenderer } from "@livekit/components-react";

interface LiveStreamViewProps {
  isCreator?: boolean;
}

export function LiveStreamView({ isCreator = false }: LiveStreamViewProps) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Handle local video track (creator's stream)
  useEffect(() => {
    if (!localParticipant || !localVideoRef.current) return;

    const videoPub = Array.from(localParticipant.videoTrackPublications.values())[0];
    const videoTrack = videoPub?.track;

    if (videoTrack) {
      videoTrack.attach(localVideoRef.current);
      return () => {
        if (localVideoRef.current) {
          videoTrack.detach(localVideoRef.current);
        }
      };
    }
  }, [localParticipant]);

  // Handle remote video tracks (for viewers, show creator's stream)
  // In a live stream, viewers typically see the creator's published video
  // The first remote participant should be the creator if we're a viewer
  useEffect(() => {
    if (!remoteVideoRef.current || remoteParticipants.length === 0) return;

    // Find the creator's video track (usually the first participant with video)
    const creatorParticipant = remoteParticipants.find(
      (p) => Array.from(p.videoTrackPublications.values()).length > 0
    );

    if (creatorParticipant) {
      const videoPub = Array.from(creatorParticipant.videoTrackPublications.values())[0];
      const videoTrack = videoPub?.track;

      if (videoTrack) {
        // Ensure track is subscribed
        if (videoPub && !videoPub.isSubscribed) {
          videoPub.setSubscribed(true);
        }

        videoTrack.attach(remoteVideoRef.current);
        return () => {
          if (remoteVideoRef.current) {
            videoTrack.detach(remoteVideoRef.current);
          }
        };
      }
    }
  }, [remoteParticipants]);

  if (!room || room.state !== "connected") {
    return (
      <div className="flex items-center justify-center h-full bg-black text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
          <p>Connecting to stream...</p>
        </div>
      </div>
    );
  }

  // For creators: show their own video
  // For viewers: show the creator's video (from remote participants)
  const showLocalVideo = isCreator && localParticipant && 
    Array.from(localParticipant.videoTrackPublications.values())[0]?.track;

  const showRemoteVideo = !isCreator && remoteParticipants.length > 0;

  return (
    <div className="h-full w-full bg-black relative">
      {/* Creator's video (local for creator, remote for viewers) */}
      {showLocalVideo && (
        <video
          ref={localVideoRef}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          muted={isCreator}
        />
      )}

      {showRemoteVideo && (
        <video
          ref={remoteVideoRef}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
        />
      )}

      {/* Loading/No video state */}
      {!showLocalVideo && !showRemoteVideo && (
        <div className="flex items-center justify-center h-full text-white">
          <div className="text-center">
            <p>Waiting for stream to start...</p>
          </div>
        </div>
      )}

      {/* Audio tracks rendered automatically */}
      <RoomAudioRenderer />
    </div>
  );
}
