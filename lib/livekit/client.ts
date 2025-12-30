/**
 * LiveKit client initialization utilities
 */

import { Room, RoomEvent, DataPacket_Kind } from "livekit-client";
import { env } from "@/env";

/**
 * Initialize and connect to a LiveKit room
 */
export async function connectToRoom(
  room: Room,
  url: string,
  token: string,
  options?: {
    audio?: boolean;
    video?: boolean;
    dataChannel?: boolean;
  }
): Promise<void> {
  try {
    await room.connect(url, token, {
      autoSubscribe: true,
    });

    // Enable audio/video tracks if requested
    if (options?.audio) {
      await room.localParticipant.setMicrophoneEnabled(true);
    }
    if (options?.video) {
      await room.localParticipant.setCameraEnabled(true);
    }
  } catch (error) {
    console.error("Error connecting to LiveKit room:", error);
    throw error;
  }
}

/**
 * Send data message via LiveKit data channel
 */
export function sendDataMessage(
  room: Room,
  message: string | Uint8Array,
  kind: DataPacket_Kind = DataPacket_Kind.RELIABLE
): void {
  try {
    const data = typeof message === "string" ? new TextEncoder().encode(message) : message;
    room.localParticipant.publishData(data, { reliable: kind === DataPacket_Kind.RELIABLE });
  } catch (error) {
    console.error("Error sending data message:", error);
    throw error;
  }
}

/**
 * Get LiveKit WebSocket URL
 */
export function getLiveKitUrl(): string {
  return env.NEXT_PUBLIC_LIVEKIT_URL;
}

/**
 * Create a new LiveKit room instance
 */
export function createRoom(): Room {
  return new Room({
    adaptiveStream: true,
    dynacast: true,
    videoCaptureDefaults: {
      resolution: {
        width: 1280,
        height: 720,
      },
    },
  });
}

