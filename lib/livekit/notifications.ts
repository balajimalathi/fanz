/**
 * Realtime notifications via LiveKit Data Channels
 */

import { Room, DataPacket_Kind } from "livekit-client";
import { sendDataMessage } from "./client";

export interface NotificationPayload {
  type: string;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Send notification via LiveKit data channel
 */
export function sendNotification(
  room: Room,
  payload: NotificationPayload,
  kind: DataPacket_Kind = DataPacket_Kind.RELIABLE
): void {
  try {
    const data = JSON.stringify({
      type: "notification",
      ...payload,
      timestamp: new Date().toISOString(),
    });
    sendDataMessage(room, data, kind);
  } catch (error) {
    console.error("Error sending notification:", error);
  }
}

/**
 * Notify fan that creator sent a message
 */
export function notifyFanMessage(room: Room, creatorName: string): void {
  sendNotification(room, {
    type: "message_received",
    title: "New Message",
    message: `${creatorName} sent you a message`,
    link: "/home/inbox",
  });
}

/**
 * Notify creator that fan sent a message
 */
export function notifyCreatorMessage(room: Room, fanName: string): void {
  sendNotification(room, {
    type: "message_received",
    title: "New Message",
    message: `${fanName} sent you a message`,
    link: "/home/inbox",
  });
}

/**
 * Notify fan that creator started fulfillment
 */
export function notifyFulfillmentStarted(room: Room, creatorName: string): void {
  sendNotification(room, {
    type: "fulfillment_started",
    title: "Fulfillment Started",
    message: `${creatorName} has started your service fulfillment`,
    link: "/home/inbox",
  });
}

/**
 * Notify followers that creator started livestream
 */
export function notifyLivestreamStarted(room: Room, creatorName: string, creatorUsername: string): void {
  sendNotification(room, {
    type: "livestream_started",
    title: "Live Now",
    message: `${creatorName} is now live`,
    link: `/u/${creatorUsername}`,
    metadata: {
      creatorUsername,
    },
  });
}

