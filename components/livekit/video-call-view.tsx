"use client";

import { useEffect, useRef, useState } from "react";
import { useRoomContext, useLocalParticipant, useRemoteParticipants, RoomAudioRenderer } from "@livekit/components-react";
import { Track, RemoteTrackPublication, RemoteParticipant } from "livekit-client";

export function VideoCallView() {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [remoteVideoTrack, setRemoteVideoTrack] = useState<Track | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<Track | null>(null);

  // Handle local video track - detect track from local participant
  useEffect(() => {
    
    const logData1 = {location:'video-call-view.tsx:18',message:'Local track detection effect started',data:{hasLocalParticipant:!!localParticipant,participantId:localParticipant?.identity},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'};
    console.log('[DEBUG H1]', logData1);
    
    
    if (!localParticipant) {
      
      
      
      setLocalVideoTrack(null);
      return;
    }

    // Function to get local video track
    const getLocalVideoTrack = () => {
      const videoPubs = Array.from(localParticipant.videoTrackPublications.values());
      
      const logData2 = {location:'video-call-view.tsx:28',message:'Checking video publications',data:{totalPubs:videoPubs.length,pubKinds:videoPubs.map(p=>p.kind),pubSources:videoPubs.map(p=>p.source)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'};
      console.log('[DEBUG H1]', logData2);
      
      
      const videoPub = videoPubs.find(pub => pub.kind === Track.Kind.Video);
      const track = videoPub?.track || null;
      
      const logData3 = {location:'video-call-view.tsx:30',message:'Track lookup result',data:{foundVideoPub:!!videoPub,hasTrack:!!track,trackId:track?.sid},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'};
      console.log('[DEBUG H1]', logData3);
      
      
      return track;
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
    if (!room) return;

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
      const remoteParticipant = remoteParticipants[0];
      const videoPubs = Array.from(remoteParticipant.videoTrackPublications.values());
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

    return () => {
      room.off("trackPublished", handleTrackPublished);
      room.off("trackSubscribed", handleTrackSubscribed);
      room.off("trackUnsubscribed", handleTrackUnsubscribed);
    };
  }, [room, remoteParticipants]);

  // Attach remote video track to video element
  useEffect(() => {
    if (!remoteVideoTrack || !remoteVideoRef.current) return;

    // Ensure video element is ready
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

  // Attach local video track to video element
  useEffect(() => {
    
    const logData4 = {location:'video-call-view.tsx:149',message:'Local video attachment effect started',data:{hasTrack:!!localVideoTrack,trackId:localVideoTrack?.sid,hasRef:!!localVideoRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'};
    console.log('[DEBUG H2]', logData4);
    
    
    if (!localVideoTrack || !localVideoRef.current) {
      
      
      
      return;
    }

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

  const hasRemoteVideo = remoteVideoTrack !== null;
  const hasLocalVideo = localVideoTrack !== null;

    
    useEffect(() => {
      const logData5 = {location:'video-call-view.tsx:195',message:'Render state check',data:{hasLocalVideo,hasRemoteVideo,localVideoRefExists:!!localVideoRef.current,remoteVideoRefExists:!!remoteVideoRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'};
      console.log('[DEBUG H2]', logData5);
      
    }, [hasLocalVideo, hasRemoteVideo]);
    

  if (!room || room.state !== "connected") {
    return (
      <div className="flex items-center justify-center h-full bg-black text-white">
        Connecting...
      </div>
    );
  }

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
            muted={false}
          />
        </div>
      ) : (
        <div className="flex items-center justify-center h-full text-white">
          Waiting for other participant...
        </div>
      )}

      {/* Local video (small preview in corner) - always render but show/hide based on track */}
      <div 
        className={`absolute bottom-4 right-4 w-48 h-36 rounded-lg overflow-hidden border-2 border-white bg-black ${
          hasLocalVideo ? 'block' : 'hidden'
        }`}
      >
        <video
          ref={localVideoRef}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          muted
        />
      </div>

      {/* Audio tracks rendered automatically by RoomAudioRenderer */}
      <RoomAudioRenderer />
    </div>
  );
}
