"use client";

import { useEffect, useState } from "react";
import { Room, Track, RemoteParticipant, LocalTrackPublication } from "livekit-client";
import { useRoom } from "./room-provider";
import { VideoTrack } from "./video-track";
import { AudioTrack } from "./audio-track";

export function VideoCallView() {
  const { room, isConnected } = useRoom();
  const [remoteVideoTracks, setRemoteVideoTracks] = useState<Track[]>([]);
  const [remoteAudioTracks, setRemoteAudioTracks] = useState<Track[]>([]);
  const [localVideoTrack, setLocalVideoTrack] = useState<Track | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<Track | null>(null);

  useEffect(() => {
    if (!room || !isConnected) return;

    const updateTracks = () => {
      // Get local participant tracks
      const localVideoPub = Array.from(room.localParticipant.videoTrackPublications.values())[0];
      const localAudioPub = Array.from(room.localParticipant.audioTrackPublications.values())[0];
      
      if (localVideoPub?.track) {
        setLocalVideoTrack(localVideoPub.track);
      }
      if (localAudioPub?.track) {
        setLocalAudioTrack(localAudioPub.track);
      }

      // Get remote participant tracks
      const videoTracks: Track[] = [];
      const audioTracks: Track[] = [];
      
      room.remoteParticipants.forEach((participant: RemoteParticipant) => {
        participant.videoTrackPublications.forEach((pub) => {
          if (pub.track) {
            videoTracks.push(pub.track);
          }
        });
        participant.audioTrackPublications.forEach((pub) => {
          if (pub.track) {
            audioTracks.push(pub.track);
          }
        });
      });
      
      setRemoteVideoTracks(videoTracks);
      setRemoteAudioTracks(audioTracks);
    };

    // Initial update
    updateTracks();

    // Subscribe to track events using room event system
    const handleTrackSubscribed = () => updateTracks();
    const handleTrackUnsubscribed = () => updateTracks();
    const handleParticipantConnected = () => updateTracks();
    const handleParticipantDisconnected = () => updateTracks();

    room.on("trackSubscribed", handleTrackSubscribed);
    room.on("trackUnsubscribed", handleTrackUnsubscribed);
    room.on("participantConnected", handleParticipantConnected);
    room.on("participantDisconnected", handleParticipantDisconnected);

    return () => {
      room.off("trackSubscribed", handleTrackSubscribed);
      room.off("trackUnsubscribed", handleTrackUnsubscribed);
      room.off("participantConnected", handleParticipantConnected);
      room.off("participantDisconnected", handleParticipantDisconnected);
    };
  }, [room, isConnected]);

  if (!isConnected || !room) {
    return (
      <div className="flex items-center justify-center h-full bg-black text-white">
        Connecting...
      </div>
    );
  }

  return (
    <div className="h-full bg-black relative">
      {/* Remote video tracks */}
      {remoteVideoTracks.length > 0 ? (
        <div className="h-full w-full">
          {remoteVideoTracks.map((track, index) => (
            <div key={index} className="absolute inset-0">
              <VideoTrack track={track} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center h-full text-white">
          Waiting for other participant...
        </div>
      )}

      {/* Local video (small preview in corner) */}
      {localVideoTrack && (
        <div className="absolute bottom-4 right-4 w-48 h-36 rounded-lg overflow-hidden border-2 border-white bg-black">
          <VideoTrack track={localVideoTrack} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Audio tracks (hidden) */}
      {localAudioTrack && <AudioTrack track={localAudioTrack} />}
      {remoteAudioTracks.map((track, index) => (
        <AudioTrack key={index} track={track} />
      ))}
    </div>
  );
}
