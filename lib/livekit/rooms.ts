/**
 * Room naming and permission utilities for LiveKit
 */

export type RoomType = "chat" | "call" | "livestream" | "presence";

/**
 * Generate chat room name from service order ID
 */
export function getChatRoomName(serviceOrderId: string): string {
  return `chat-${serviceOrderId}`;
}

/**
 * Generate call room name from service order ID
 */
export function getCallRoomName(serviceOrderId: string): string {
  return `call-${serviceOrderId}`;
}

/**
 * Generate livestream room name from creator username
 */
export function getLivestreamRoomName(creatorUsername: string): string {
  return `live-${creatorUsername}`;
}

/**
 * Generate presence room name from user ID
 */
export function getPresenceRoomName(userId: string): string {
  return `presence-${userId}`;
}

/**
 * Determine if user can publish in a room based on role and room type
 */
export function canPublish(
  userRole: "creator" | "fan",
  roomType: RoomType,
  isOwner: boolean
): boolean {
  switch (roomType) {
    case "chat":
      // Both can publish data messages
      return true;
    case "call":
      // Both can publish tracks
      return true;
    case "livestream":
      // Only creator can publish
      return userRole === "creator" && isOwner;
    case "presence":
      // Everyone can publish their own presence
      return true;
    default:
      return false;
  }
}

/**
 * Determine if user can subscribe in a room
 */
export function canSubscribe(
  userRole: "creator" | "fan",
  roomType: RoomType
): boolean {
  switch (roomType) {
    case "chat":
      // Both can subscribe to data messages
      return true;
    case "call":
      // Both can subscribe to tracks
      return true;
    case "livestream":
      // Everyone can subscribe (fans only)
      return true;
    case "presence":
      // Everyone can subscribe to presence
      return true;
    default:
      return false;
  }
}

/**
 * Get room type from room name
 */
export function getRoomTypeFromName(roomName: string): RoomType | null {
  if (roomName.startsWith("chat-")) return "chat";
  if (roomName.startsWith("call-")) return "call";
  if (roomName.startsWith("live-")) return "livestream";
  if (roomName.startsWith("presence-")) return "presence";
  return null;
}

/**
 * Extract service order ID from chat/call room name
 */
export function extractServiceOrderId(roomName: string): string | null {
  const match = roomName.match(/^(chat|call)-(.+)$/);
  return match ? match[2] : null;
}

/**
 * Extract creator username from livestream room name
 */
export function extractCreatorUsername(roomName: string): string | null {
  const match = roomName.match(/^live-(.+)$/);
  return match ? match[1] : null;
}

/**
 * Extract user ID from presence room name
 */
export function extractUserIdFromPresence(roomName: string): string | null {
  const match = roomName.match(/^presence-(.+)$/);
  return match ? match[1] : null;
}

