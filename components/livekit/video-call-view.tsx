"use client";

import { useEffect, useRef } from "react";
import { useRoomContext, useLocalParticipant, useRemoteParticipants, RoomAudioRenderer } from "@livekit/components-react";
import { Track } from "livekit-client";

export function VideoCallView() {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Handle local video track
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

  // Handle remote video track
  useEffect(() => {
    if (remoteParticipants.length === 0 || !remoteVideoRef.current) return;

    const remoteParticipant = remoteParticipants[0];
    const videoPub = Array.from(remoteParticipant.videoTrackPublications.values())[0];
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
  }, [remoteParticipants]);

  if (!room || room.state !== "connected") {
    return (
      <div className="flex items-center justify-center h-full bg-black text-white">
        Connecting...
      </div>
    );
  }

  const hasRemoteVideo = remoteParticipants.length > 0 && 
    Array.from(remoteParticipants[0].videoTrackPublications.values())[0]?.track;

  return (
    <div className="h-full bg-black relative">
      {/* Remote video track */}
      {hasRemoteVideo ? (
        <div className="h-full w-full">
          <video
            ref={remoteVideoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
          />
        </div>
      ) : (
        <div className="flex items-center justify-center h-full text-white">
          Waiting for other participant...
        </div>
      )}

      {/* Local video (small preview in corner) */}
      {localParticipant && Array.from(localParticipant.videoTrackPublications.values())[0]?.track && (
        <div className="absolute bottom-4 right-4 w-48 h-36 rounded-lg overflow-hidden border-2 border-white bg-black">
          <video
            ref={localVideoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted
          />
        </div>
      )}

      {/* Audio tracks rendered automatically by RoomAudioRenderer */}
      <RoomAudioRenderer />
    </div>
  );
}
