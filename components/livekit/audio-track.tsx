"use client";

import { useEffect, useRef } from "react";
import { Track } from "livekit-client";

interface AudioTrackProps {
  track: Track;
}

export function AudioTrack({ track }: AudioTrackProps) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement || !track) return;

    track.attach(audioElement);

    return () => {
      track.detach(audioElement);
    };
  }, [track]);

  return <audio ref={audioRef} autoPlay playsInline />;
}

