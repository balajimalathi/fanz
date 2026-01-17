"use client";

import { useEffect, useRef, useState } from "react";
import { useRoomContext, useLocalParticipant, useRemoteParticipants, RoomAudioRenderer } from "@livekit/components-react";
import { Track, RemoteTrackPublication, RemoteParticipant } from "livekit-client";

interface LiveStreamViewProps {
  isCreator?: boolean;
}

export function LiveStreamView({ isCreator = false }: LiveStreamViewProps) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<Track | null>(null);
  const [remoteVideoTrack, setRemoteVideoTrack] = useState<Track | null>(null);

  // Handle local video track - detect track from local participant with event listeners
  useEffect(() => {
    if (!localParticipant) {
      setLocalVideoTrack(null);
      return;
    }

    // Function to get local video track
    const getLocalVideoTrack = () => {
      const videoPubs = Array.from(localParticipant.videoTrackPublications.values());
      const videoPub = videoPubs.find(pub => pub.kind === Track.Kind.Video);
      return videoPub?.track || null;
    };

    // Set initial track
    const initialTrack = getLocalVideoTrack();
    setLocalVideoTrack(initialTrack);

    // Listen for local track published event
    const handleLocalTrackPublished = () => {
      const track = getLocalVideoTrack();
      setLocalVideoTrack(track);
    };

    const handleLocalTrackUnpublished = () => {
      const track = getLocalVideoTrack();
      setLocalVideoTrack(track);
    };

    localParticipant.on("localTrackPublished", handleLocalTrackPublished);
    localParticipant.on("localTrackUnpublished", handleLocalTrackUnpublished);

    return () => {
      localParticipant.off("localTrackPublished", handleLocalTrackPublished);
      localParticipant.off("localTrackUnpublished", handleLocalTrackUnpublished);
    };
  }, [localParticipant]);

  // Subscribe to remote video tracks and handle track events
  useEffect(() => {
    if (!room || isCreator) return;

    const handleTrackPublished = (
      publication: RemoteTrackPublication,
      participant: RemoteParticipant
    ) => {
      if (publication.kind === Track.Kind.Video) {
        // Subscribe to the track
        if (publication.track) {
          // Track is already available
          setRemoteVideoTrack(publication.track);
        } else {
          // Subscribe to get the track
          publication.setSubscribed(true);
        }
      }
    };

    const handleTrackSubscribed = (
      track: Track,
      publication: RemoteTrackPublication,
      participant: RemoteParticipant
    ) => {
      if (track.kind === Track.Kind.Video) {
        setRemoteVideoTrack(track);
      }
    };

    const handleTrackUnsubscribed = (
      track: Track,
      publication: RemoteTrackPublication,
      participant: RemoteParticipant
    ) => {
      if (track.kind === Track.Kind.Video) {
        setRemoteVideoTrack((currentTrack) => {
          return currentTrack === track ? null : currentTrack;
        });
      }
    };

    // Subscribe to room events
    room.on("trackPublished", handleTrackPublished);
    room.on("trackSubscribed", handleTrackSubscribed);
    room.on("trackUnsubscribed", handleTrackUnsubscribed);

    // Check for existing remote participants with video tracks
    if (remoteParticipants.length > 0) {
      // Find the creator's video track (usually the first participant with video)
      const creatorParticipant = remoteParticipants.find(
        (p) => {
          const videoPubs = Array.from(p.videoTrackPublications.values());
          return videoPubs.find(pub => pub.kind === Track.Kind.Video);
        }
      );

      if (creatorParticipant) {
        const videoPubs = Array.from(creatorParticipant.videoTrackPublications.values());
        const videoPub = videoPubs.find(pub => pub.kind === Track.Kind.Video);

        if (videoPub) {
          if (videoPub.track) {
            // Track is already subscribed
            setRemoteVideoTrack(videoPub.track);
          } else {
            // Subscribe to the track
            videoPub.setSubscribed(true);
          }
        }
      }
    }

    return () => {
      room.off("trackPublished", handleTrackPublished);
      room.off("trackSubscribed", handleTrackSubscribed);
      room.off("trackUnsubscribed", handleTrackUnsubscribed);
    };
  }, [room, remoteParticipants, isCreator]);

  // Attach local video track to video element
  useEffect(() => {
    if (!localVideoTrack || !localVideoRef.current) return;

    const videoElement = localVideoRef.current;
    
    // Detach any existing attachments first
    localVideoTrack.detach();
    
    // Attach the track
    localVideoTrack.attach(videoElement);

    // Force video to play with retry
    const playVideo = async () => {
      try {
        await videoElement.play();
      } catch (err) {
        console.error("Error playing local video:", err);
        // Retry after a short delay
        setTimeout(() => {
          videoElement.play().catch(() => {});
        }, 100);
      }
    };
    playVideo();

    return () => {
      if (videoElement) {
        localVideoTrack.detach(videoElement);
      }
    };
  }, [localVideoTrack]);

  // Attach remote video track to video element
  useEffect(() => {
    if (!remoteVideoTrack || !remoteVideoRef.current) return;

    const videoElement = remoteVideoRef.current;
    
    // Attach the track
    remoteVideoTrack.attach(videoElement);

    // Force video to play
    videoElement.play().catch((err) => {
      console.error("Error playing remote video:", err);
    });

    return () => {
      if (videoElement) {
        remoteVideoTrack.detach(videoElement);
      }
    };
  }, [remoteVideoTrack]);

  const hasLocalVideo = localVideoTrack !== null;
  const hasRemoteVideo = remoteVideoTrack !== null;

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

  return (
    <div className="h-full w-full bg-black relative">
      {/* Creator's video (local for creator) - always render but hide if no track */}
      {isCreator && (
        <video
          ref={localVideoRef}
          className={`w-full h-full object-cover ${hasLocalVideo ? 'block' : 'hidden'}`}
          autoPlay
          playsInline
          muted={true}
        />
      )}

      {/* Remote video (for viewers, show creator's stream) - always render but hide if no track */}
      {!isCreator && (
        <video
          ref={remoteVideoRef}
          className={`w-full h-full object-cover ${hasRemoteVideo ? 'block' : 'hidden'}`}
          autoPlay
          playsInline
          muted={false}
        />
      )}

      {/* Loading/No video state */}
      {((isCreator && !hasLocalVideo) || (!isCreator && !hasRemoteVideo)) && (
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
