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
    await publisher.publish(channel, JSON.stringify(message));
  } catch (error) {
    console.error("Error publishing message to Redis:", error);
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
    
    subscriber.on("message", (receivedChannel, message) => {
      if (receivedChannel === channel) {
        try {
          const parsedMessage = JSON.parse(message);
          callback(parsedMessage);
        } catch (error) {
          console.error("Error parsing Redis message:", error);
        }
      }
    });
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
    await publisher.publish(channel, JSON.stringify(typingEvent));
  } catch (error) {
    console.error("Error publishing typing event to Redis:", error);
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
    
    subscriber.on("message", (receivedChannel, message) => {
      if (receivedChannel === channel) {
        try {
          const parsedEvent = JSON.parse(message);
          callback(parsedEvent);
        } catch (error) {
          console.error("Error parsing Redis typing event:", error);
        }
      }
    });
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

