import { AccessToken } from "livekit-server-sdk";
import { env } from "@/env";

export interface GenerateTokenOptions {
  roomName: string;
  participantIdentity: string;
  participantName: string;
  canPublish?: boolean;
  canSubscribe?: boolean;
  canPublishData?: boolean;
}

/**
 * Generate a LiveKit access token for a participant
 */
export function generateAccessToken(options: GenerateTokenOptions): string {
  const {
    roomName,
    participantIdentity,
    participantName,
    canPublish = true,
    canSubscribe = true,
    canPublishData = true,
  } = options;

  const at = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
    identity: participantIdentity,
    name: participantName,
  });

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish,
    canSubscribe,
    canPublishData,
  });

  return at.toJwt();
}

