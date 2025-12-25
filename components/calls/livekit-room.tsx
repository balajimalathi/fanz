"use client";

import { useEffect, useRef } from "react";

interface LiveKitRoomProps {
  url: string;
  token: string;
  roomName: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
}

export function LiveKitRoom({
  url,
  token,
  roomName,
  audioEnabled,
  videoEnabled,
}: LiveKitRoomProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Dynamically import LiveKit client
    import("livekit-client")
      .then(({ Room, RemoteParticipant, RemoteTrack, RemoteTrackPublication, Track }) => {
        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
        });

        room.connect(url, token).then(() => {
          console.log("Connected to LiveKit room:", roomName);

          // Handle remote participants
          room.on("participantConnected", (participant: RemoteParticipant) => {
            console.log("Participant connected:", participant.identity);

            participant.on("trackSubscribed", (track: RemoteTrack, publication: RemoteTrackPublication) => {
              if (track.kind === "video") {
                const videoElement = document.createElement("video");
                videoElement.autoplay = true;
                videoElement.playsInline = true;
                videoElement.srcObject = new MediaStream([track.mediaStreamTrack]);
                if (containerRef.current) {
                  containerRef.current.innerHTML = "";
                  containerRef.current.appendChild(videoElement);
                }
              } else if (track.kind === "audio") {
                const audioElement = document.createElement("audio");
                audioElement.autoplay = true;
                audioElement.srcObject = new MediaStream([track.mediaStreamTrack]);
                document.body.appendChild(audioElement);
              }
            });
          });

          // Enable local tracks
          if (audioEnabled) {
            room.localParticipant.enableCameraAndMicrophone(false, true);
          }
          if (videoEnabled) {
            room.localParticipant.enableCameraAndMicrophone(true, false);
          }
        });

        return () => {
          room.disconnect();
        };
      })
      .catch((error) => {
        console.error("Error loading LiveKit client:", error);
        if (containerRef.current) {
          containerRef.current.innerHTML = "<p>LiveKit not available. Please install livekit-client package.</p>";
        }
      });
  }, [url, token, roomName, audioEnabled, videoEnabled]);

  return <div ref={containerRef} className="w-full h-full" />;
}

