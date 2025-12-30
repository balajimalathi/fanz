/**
 * Presence tracking utilities for LiveKit
 * Tracks online/offline status of users via presence rooms
 */

import { RoomServiceClient } from "livekit-server-sdk";
import { env } from "@/env";
import { getPresenceRoomName } from "./rooms";

// Initialize LiveKit server client
const livekitClient = new RoomServiceClient(env.LIVEKIT_URL, env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET);

/**
 * Check if a user is online by checking their presence room
 */
export async function isUserOnline(userId: string): Promise<boolean> {
  try {
    const roomName = getPresenceRoomName(userId);
    const rooms = await livekitClient.listRooms([roomName]);
    
    if (rooms.length === 0) {
      return false;
    }
    
    const room = rooms[0];
    // User is online if room exists and has active participants
    return room.numParticipants > 0;
  } catch (error) {
    console.error(`Error checking online status for user ${userId}:`, error);
    return false;
  }
}

/**
 * Get online status for multiple users
 */
export async function getOnlineStatus(userIds: string[]): Promise<Map<string, boolean>> {
  const statusMap = new Map<string, boolean>();
  
  try {
    // Get all presence room names
    const roomNames = userIds.map((userId) => getPresenceRoomName(userId));
    
    // List all rooms at once
    const rooms = await livekitClient.listRooms(roomNames);
    
    // Create a map of room name to online status
    const roomStatusMap = new Map<string, boolean>();
    for (const room of rooms) {
      roomStatusMap.set(room.name, room.numParticipants > 0);
    }
    
    // Map back to user IDs
    for (const userId of userIds) {
      const roomName = getPresenceRoomName(userId);
      statusMap.set(userId, roomStatusMap.get(roomName) ?? false);
    }
  } catch (error) {
    console.error("Error getting online status for multiple users:", error);
    // Set all to false on error
    for (const userId of userIds) {
      statusMap.set(userId, false);
    }
  }
  
  return statusMap;
}

/**
 * Get list of online user IDs
 */
export async function getOnlineUsers(userIds: string[]): Promise<string[]> {
  const statusMap = await getOnlineStatus(userIds);
  const onlineUsers: string[] = [];
  
  for (const [userId, isOnline] of statusMap.entries()) {
    if (isOnline) {
      onlineUsers.push(userId);
    }
  }
  
  return onlineUsers;
}

