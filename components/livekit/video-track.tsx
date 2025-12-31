"use client";

import { useEffect, useRef } from "react";
import { Track } from "livekit-client";

interface VideoTrackProps {
  track: Track;
  className?: string;
}

export function VideoTrack({ track, className }: VideoTrackProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement || !track) return;

    track.attach(videoElement);

    return () => {
      track.detach(videoElement);
    };
  }, [track]);

  return (
    <video
      ref={videoRef}
      className={className}
      autoPlay
      playsInline
      muted
    />
  );
}

