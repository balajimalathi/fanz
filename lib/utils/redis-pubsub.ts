import Redis from "ioredis";
import { env } from "@/env";

// Redis connection configuration for Pub/Sub
const redisConfig = {
  host: env.REDIS_HOST,
  port: parseInt(env.REDIS_PORT),
  password: env.REDIS_PASSWORD,
  db: parseInt(env.REDIS_DB),
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
};

// Publisher client (for sending messages)
let publisherClient: Redis | null = null;

// Get or create publisher client
function getPublisherClient(): Redis {
  if (!publisherClient) {
    publisherClient = new Redis(redisConfig);
    publisherClient.on("error", (err) => {
      console.error("Redis Publisher Error:", err);
    });
  }
  return publisherClient;
}

// Subscriber client (for receiving messages)
// Note: Each SSE connection should have its own subscriber client
export function createSubscriberClient(): Redis {
  const subscriber = new Redis(redisConfig);
  subscriber.on("error", (err) => {
    console.error("Redis Subscriber Error:", err);
  });
  return subscriber;
}

/**
 * Publish a message to a conversation channel
 * @param conversationId - The conversation ID
 * @param message - The message object to publish
 */
export async function publishMessage(
  conversationId: string,
  message: unknown
): Promise<void> {
  try {
    const publisher = getPublisherClient();
    const channel = `conversation:${conversationId}`;
    const messageStr = JSON.stringify(message);
    console.log("[Redis Pub/Sub] Publishing message to channel:", channel);
    const subscribers = await publisher.publish(channel, messageStr);
    console.log("[Redis Pub/Sub] Message published, subscribers notified:", subscribers);
  } catch (error) {
    console.error("[Redis Pub/Sub] Error publishing message to Redis:", error);
    // Don't throw - graceful degradation
  }
}

/**
 * Subscribe to a conversation channel
 * @param subscriber - Redis subscriber client
 * @param conversationId - The conversation ID to subscribe to
 * @param callback - Callback function to handle received messages
 */
export async function subscribeToConversation(
  subscriber: Redis,
  conversationId: string,
  callback: (message: unknown) => void
): Promise<void> {
  try {
    const channel = `conversation:${conversationId}`;
    await subscriber.subscribe(channel);
    
    // Create a handler that filters by channel
    // Multiple handlers can coexist - Redis fires "message" for all subscribed channels
    const messageHandler = (receivedChannel: string, message: string) => {
      if (receivedChannel === channel) {
        try {
          const parsedMessage = JSON.parse(message);
          callback(parsedMessage);
        } catch (error) {
          console.error("Error parsing Redis message:", error);
        }
      }
    };
    
    // Add handler - can coexist with typing events handler
    subscriber.on("message", messageHandler);
  } catch (error) {
    console.error("Error subscribing to Redis channel:", error);
    throw error;
  }
}

/**
 * Unsubscribe from a conversation channel
 * @param subscriber - Redis subscriber client
 * @param conversationId - The conversation ID to unsubscribe from
 */
export async function unsubscribeFromConversation(
  subscriber: Redis,
  conversationId: string
): Promise<void> {
  try {
    const channel = `conversation:${conversationId}`;
    await subscriber.unsubscribe(channel);
  } catch (error) {
    console.error("Error unsubscribing from Redis channel:", error);
  }
}

/**
 * Clean up and close a subscriber client
 * @param subscriber - Redis subscriber client to close
 */
export async function closeSubscriberClient(subscriber: Redis): Promise<void> {
  try {
    await subscriber.quit();
  } catch (error) {
    console.error("Error closing Redis subscriber:", error);
  }
}

/**
 * Publish a typing event to a conversation channel
 * @param conversationId - The conversation ID
 * @param userId - The user ID who is typing
 * @param userName - The user name who is typing
 */
export async function publishTypingEvent(
  conversationId: string,
  userId: string,
  userName: string
): Promise<void> {
  try {
    const publisher = getPublisherClient();
    const channel = `conversation:${conversationId}:typing`;
    const typingEvent = {
      userId,
      userName,
      timestamp: Date.now(),
    };
    const messageStr = JSON.stringify(typingEvent);
    console.log("[Redis Pub/Sub] Publishing typing event to channel:", channel, "for user:", userName);
    const subscribers = await publisher.publish(channel, messageStr);
    console.log("[Redis Pub/Sub] Typing event published, subscribers notified:", subscribers);
  } catch (error) {
    console.error("[Redis Pub/Sub] Error publishing typing event to Redis:", error);
    // Don't throw - graceful degradation
  }
}

/**
 * Subscribe to typing events for a conversation
 * @param subscriber - Redis subscriber client
 * @param conversationId - The conversation ID to subscribe to
 * @param callback - Callback function to handle received typing events
 */
export async function subscribeToTypingEvents(
  subscriber: Redis,
  conversationId: string,
  callback: (event: { userId: string; userName: string; timestamp: number }) => void
): Promise<void> {
  try {
    const channel = `conversation:${conversationId}:typing`;
    await subscriber.subscribe(channel);
    
    // Create a handler that processes both message channels
    // This handler will be used alongside the conversation message handler
    const messageHandler = (receivedChannel: string, message: string) => {
      if (receivedChannel === channel) {
        try {
          const parsedEvent = JSON.parse(message);
          callback(parsedEvent);
        } catch (error) {
          console.error("Error parsing Redis typing event:", error);
        }
      }
    };
    
    // Add handler - this will work alongside the conversation message handler
    // since Redis fires "message" events for all subscribed channels
    subscriber.on("message", messageHandler);
  } catch (error) {
    console.error("Error subscribing to typing events:", error);
    throw error;
  }
}

/**
 * Unsubscribe from typing events for a conversation
 * @param subscriber - Redis subscriber client
 * @param conversationId - The conversation ID to unsubscribe from
 */
export async function unsubscribeFromTypingEvents(
  subscriber: Redis,
  conversationId: string
): Promise<void> {
  try {
    const channel = `conversation:${conversationId}:typing`;
    await subscriber.unsubscribe(channel);
  } catch (error) {
    console.error("Error unsubscribing from typing events:", error);
  }
}

export interface CallEvent {
  type: "incoming_call" | "call_accepted" | "call_rejected" | "call_ended" | "call_missed";
  callId: string;
  conversationId?: string;
  callerId: string;
  receiverId: string;
  callType: "audio" | "video";
  status: string;
  timestamp: number;
}

/**
 * Publish a call event to Redis
 * @param userId - The user ID to publish the event for (for user-specific channels)
 * @param event - The call event object to publish
 */
export async function publishCallEvent(
  userId: string,
  event: CallEvent
): Promise<void> {
  try {
    const publisher = getPublisherClient();
    const channel = `call:${userId}`;
    await publisher.publish(channel, JSON.stringify(event));
  } catch (error) {
    console.error("Error publishing call event to Redis:", error);
    // Don't throw - graceful degradation
  }
}

/**
 * Subscribe to call events for a user
 * @param subscriber - Redis subscriber client
 * @param userId - The user ID to subscribe to call events for
 * @param callback - Callback function to handle received call events
 */
export async function subscribeToCallEvents(
  subscriber: Redis,
  userId: string,
  callback: (event: CallEvent) => void
): Promise<void> {
  try {
    const channel = `call:${userId}`;
    await subscriber.subscribe(channel);
    
    subscriber.on("message", (receivedChannel, message) => {
      if (receivedChannel === channel) {
        try {
          const parsedEvent = JSON.parse(message) as CallEvent;
          callback(parsedEvent);
        } catch (error) {
          console.error("Error parsing Redis call event:", error);
        }
      }
    });
  } catch (error) {
    console.error("Error subscribing to call events:", error);
    throw error;
  }
}

/**
 * Unsubscribe from call events for a user
 * @param subscriber - Redis subscriber client
 * @param userId - The user ID to unsubscribe from
 */
export async function unsubscribeFromCallEvents(
  subscriber: Redis,
  userId: string
): Promise<void> {
  try {
    const channel = `call:${userId}`;
    await subscriber.unsubscribe(channel);
  } catch (error) {
    console.error("Error unsubscribing from call events:", error);
  }
}

export interface LiveStreamEvent {
  type: "stream_started" | "stream_ended";
  creatorId: string;
  streamId?: string;
  streamType?: "free" | "follower_only" | "paid";
  price?: number | null;
  timestamp: number;
}

/**
 * Publish a live stream event to Redis
 * @param creatorId - The creator ID to publish the event for (for creator-specific channels)
 * @param event - The live stream event object to publish
 */
export async function publishLiveStreamEvent(
  creatorId: string,
  event: LiveStreamEvent
): Promise<void> {
  try {
    const publisher = getPublisherClient();
    const channel = `live:${creatorId}`;
    await publisher.publish(channel, JSON.stringify(event));
    console.log("[Redis Pub/Sub] Published live stream event to channel:", channel, "event:", event.type);
  } catch (error) {
    console.error("Error publishing live stream event to Redis:", error);
    // Don't throw - graceful degradation
  }
}

/**
 * Subscribe to live stream events for a creator
 * @param subscriber - Redis subscriber client
 * @param creatorId - The creator ID to subscribe to live stream events for
 * @param callback - Callback function to handle received live stream events
 */
export async function subscribeToLiveStreamEvents(
  subscriber: Redis,
  creatorId: string,
  callback: (event: LiveStreamEvent) => void
): Promise<void> {
  try {
    const channel = `live:${creatorId}`;
    await subscriber.subscribe(channel);
    
    subscriber.on("message", (receivedChannel, message) => {
      if (receivedChannel === channel) {
        try {
          const parsedEvent = JSON.parse(message) as LiveStreamEvent;
          callback(parsedEvent);
        } catch (error) {
          console.error("Error parsing Redis live stream event:", error);
        }
      }
    });
  } catch (error) {
    console.error("Error subscribing to live stream events:", error);
    throw error;
  }
}

/**
 * Unsubscribe from live stream events for a creator
 * @param subscriber - Redis subscriber client
 * @param creatorId - The creator ID to unsubscribe from
 */
export async function unsubscribeFromLiveStreamEvents(
  subscriber: Redis,
  creatorId: string
): Promise<void> {
  try {
    const channel = `live:${creatorId}`;
    await subscriber.unsubscribe(channel);
  } catch (error) {
    console.error("Error unsubscribing from live stream events:", error);
  }
}

// ============================================================================
// Redis Streams for Message Queue
// ============================================================================

export const MESSAGE_STREAM_KEY = "messages:queue";
export const MESSAGE_CONSUMER_GROUP = "message-processors";
export const MESSAGE_CONSUMER_NAME = "processor-1";

export interface QueuedMessage {
  id?: string; // Optional message ID (will be generated if not provided)
  conversationId: string;
  senderId: string;
  messageType: string;
  content: string | null;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  timestamp: number;
  coinsPending?: number | null; // Coins that will be deducted when creator replies
  coinsDeducted?: boolean; // Whether coins have been deducted
}

/**
 * Queue a message to Redis Stream for async persistence
 * @param message - The message data to queue
 * @returns The stream ID of the queued message
 */
export async function queueMessage(message: QueuedMessage): Promise<string | null> {
  try {
    const publisher = getPublisherClient();
    const fields: (string | number)[] = [
      "conversationId", message.conversationId,
      "senderId", message.senderId,
      "messageType", message.messageType,
      "content", message.content || "",
      "mediaUrl", message.mediaUrl || "",
      "thumbnailUrl", message.thumbnailUrl || "",
      "timestamp", message.timestamp.toString()
    ];
    
    // Include message ID if provided
    if (message.id) {
      fields.push("messageId", message.id);
    }
    
    // Include coinsPending if provided
    if (message.coinsPending !== undefined && message.coinsPending !== null) {
      fields.push("coinsPending", message.coinsPending.toString());
    }
    
    // Include coinsDeducted if provided
    if (message.coinsDeducted !== undefined) {
      fields.push("coinsDeducted", message.coinsDeducted ? "true" : "false");
    }
    
    const streamId = await publisher.xadd(
      MESSAGE_STREAM_KEY,
      "*", // Auto-generate stream ID
      ...fields
    );
    console.log("[Redis Streams] Message queued with stream ID:", streamId);
    return streamId;
  } catch (error) {
    console.error("[Redis Streams] Error queueing message:", error);
    return null;
  }
}

/**
 * Create consumer group for message processing if it doesn't exist
 * @param redis - Redis client instance
 */
export async function createMessageConsumerGroup(redis: Redis): Promise<void> {
  try {
    await redis.xgroup(
      "CREATE",
      MESSAGE_STREAM_KEY,
      MESSAGE_CONSUMER_GROUP,
      "0", // Start from beginning
      "MKSTREAM" // Create stream if it doesn't exist
    );
    console.log("[Redis Streams] Consumer group created:", MESSAGE_CONSUMER_GROUP);
  } catch (error: any) {
    // BUSYGROUP means group already exists, which is fine
    if (error?.message?.includes("BUSYGROUP")) {
      console.log("[Redis Streams] Consumer group already exists");
    } else {
      console.error("[Redis Streams] Error creating consumer group:", error);
      throw error;
    }
  }
}

/**
 * Read messages from the stream using consumer group
 * @param redis - Redis client instance
 * @param count - Number of messages to read (default: 10)
 * @returns Array of message entries with IDs
 */
export async function readQueuedMessages(
  redis: Redis,
  count: number = 10
): Promise<Array<{ id: string; message: QueuedMessage }>> {
  try {
    const messages = await redis.xreadgroup(
      "GROUP",
      MESSAGE_CONSUMER_GROUP,
      MESSAGE_CONSUMER_NAME,
      "COUNT",
      count.toString(),
      "BLOCK",
      "1000", // Block for 1 second if no messages
      "STREAMS",
      MESSAGE_STREAM_KEY,
      ">" // Read pending messages first, then new ones
    );

    if (!messages || messages.length === 0) {
      return [];
    }

    const results: Array<{ id: string; message: QueuedMessage }> = [];
    // ioredis returns: [[streamName, [[id, [field1, value1, field2, value2, ...]], ...]]]
    const streamData = messages[0];
    if (!streamData || !Array.isArray(streamData) || streamData.length < 2) {
      return [];
    }
    
    const streamEntries = streamData[1] as Array<[string, string[]]>;
    if (!streamEntries || !Array.isArray(streamEntries)) {
      return [];
    }

    for (const entry of streamEntries) {
      const [id, fieldArray] = entry;
      if (!id || !Array.isArray(fieldArray)) {
        continue;
      }
      
      // Convert field array [field1, value1, field2, value2, ...] to object
      const fields: Record<string, string> = {};
      for (let i = 0; i < fieldArray.length; i += 2) {
        const key = fieldArray[i] as string;
        const value = fieldArray[i + 1] as string;
        if (key && value !== undefined) {
          fields[key] = value;
        }
      }

      const message: QueuedMessage = {
        id: fields.messageId || undefined,
        conversationId: fields.conversationId,
        senderId: fields.senderId,
        messageType: fields.messageType,
        content: fields.content || null,
        mediaUrl: fields.mediaUrl || null,
        thumbnailUrl: fields.thumbnailUrl || null,
        timestamp: parseInt(fields.timestamp, 10),
        coinsPending: fields.coinsPending ? parseInt(fields.coinsPending, 10) : undefined,
        coinsDeducted: fields.coinsDeducted === "true" ? true : fields.coinsDeducted === "false" ? false : undefined,
      };
      results.push({ id, message });
    }

    return results;
  } catch (error) {
    console.error("[Redis Streams] Error reading queued messages:", error);
    return [];
  }
}

/**
 * Acknowledge a processed message
 * @param redis - Redis client instance
 * @param messageId - The stream ID of the message to acknowledge
 */
export async function acknowledgeMessage(
  redis: Redis,
  messageId: string
): Promise<void> {
  try {
    await redis.xack(
      MESSAGE_STREAM_KEY,
      MESSAGE_CONSUMER_GROUP,
      messageId
    );
    console.log("[Redis Streams] Message acknowledged:", messageId);
  } catch (error) {
    console.error("[Redis Streams] Error acknowledging message:", error);
    throw error;
  }
}

/**
 * Get a Redis client for stream operations
 * @returns A new Redis client instance
 */
export function getStreamClient(): Redis {
  const client = new Redis(redisConfig);
  client.on("error", (err) => {
    console.error("Redis Stream Client Error:", err);
  });
  return client;
}

// ============================================================================
// Live Stream Collection Updates
// ============================================================================

export interface CollectionUpdateEvent {
  type: "collection_update";
  streamId: string;
  total: number;
  currency: string;
  entryFees: number;
  tips: number;
  timestamp: number;
}

/**
 * Publish a collection update event to Redis
 * @param streamId - The stream ID to publish the event for
 * @param event - The collection update event object
 */
export async function publishCollectionUpdate(
  streamId: string,
  event: CollectionUpdateEvent
): Promise<void> {
  try {
    const publisher = getPublisherClient();
    const channel = `live:collection:${streamId}`;
    await publisher.publish(channel, JSON.stringify(event));
    console.log("[Redis Pub/Sub] Published collection update to channel:", channel);
  } catch (error) {
    console.error("Error publishing collection update to Redis:", error);
    // Don't throw - graceful degradation
  }
}

/**
 * Subscribe to collection updates for a stream
 * @param subscriber - Redis subscriber client
 * @param streamId - The stream ID to subscribe to
 * @param callback - Callback function to handle received collection updates
 */
export async function subscribeToCollectionUpdates(
  subscriber: Redis,
  streamId: string,
  callback: (event: CollectionUpdateEvent) => void
): Promise<void> {
  try {
    const channel = `live:collection:${streamId}`;
    await subscriber.subscribe(channel);
    
    subscriber.on("message", (receivedChannel, message) => {
      if (receivedChannel === channel) {
        try {
          const parsedEvent = JSON.parse(message) as CollectionUpdateEvent;
          callback(parsedEvent);
        } catch (error) {
          console.error("Error parsing Redis collection update:", error);
        }
      }
    });
  } catch (error) {
    console.error("Error subscribing to collection updates:", error);
    throw error;
  }
}

/**
 * Unsubscribe from collection updates for a stream
 * @param subscriber - Redis subscriber client
 * @param streamId - The stream ID to unsubscribe from
 */
export async function unsubscribeFromCollectionUpdates(
  subscriber: Redis,
  streamId: string
): Promise<void> {
  try {
    const channel = `live:collection:${streamId}`;
    await subscriber.unsubscribe(channel);
  } catch (error) {
    console.error("Error unsubscribing from collection updates:", error);
  }
}

