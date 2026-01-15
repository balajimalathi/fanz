import { db } from "@/lib/db/client";
import { conversation, chatMessage } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  queueMessage,
  createMessageConsumerGroup,
  readQueuedMessages,
  acknowledgeMessage,
  getStreamClient,
  QueuedMessage,
  publishMessage,
} from "@/lib/utils/redis-pubsub";

const MAX_RETRIES = 5;
const RETRY_DELAYS = [0, 1000, 2000, 4000, 8000]; // Exponential backoff in ms

/**
 * Queue a message for async persistence
 * @param messageData - The message data to queue
 * @returns The stream ID if successful, null otherwise
 */
export async function queueMessageForPersistence(
  messageData: QueuedMessage
): Promise<string | null> {
  try {
    const streamId = await queueMessage(messageData);
    if (streamId) {
      console.log("[Message Queue] Message queued successfully:", streamId);
    }
    return streamId;
  } catch (error) {
    console.error("[Message Queue] Error queueing message:", error);
    return null;
  }
}

/**
 * Persist a single message to the database
 * @param messageData - The message data to persist
 * @returns The created message object or null if failed
 */
async function persistMessageToDatabase(
  messageData: QueuedMessage
): Promise<typeof chatMessage.$inferSelect | null> {
  try {
    // Check if message already exists (by ID) to prevent duplicates
    if (messageData.id) {
      const messageId = messageData.id; // Extract to const for type narrowing
      const existing = await db.query.chatMessage.findFirst({
        where: (m, { eq: eqOp }) => eqOp(m.id, messageId),
      });
      if (existing) {
        console.log("[Message Queue] Message already exists, skipping insert:", messageData.id);
        // Still update conversation metadata
        await db
          .update(conversation)
          .set({
            lastMessageAt: new Date(messageData.timestamp),
            lastMessagePreview:
              messageData.content || (messageData.mediaUrl ? "Media" : ""),
            updatedAt: new Date(),
          })
          .where(eq(conversation.id, messageData.conversationId));
        return existing;
      }
    }

    // Insert message with ID if provided
    const insertValues: any = {
      conversationId: messageData.conversationId,
      senderId: messageData.senderId,
      messageType: messageData.messageType as any,
      content: messageData.content,
      mediaUrl: messageData.mediaUrl,
      thumbnailUrl: messageData.thumbnailUrl,
      // Use the timestamp from the message to ensure consistent ordering
      // This prevents DB defaultNow() from creating a different timestamp
      createdAt: new Date(messageData.timestamp),
    };
    
    // Use provided ID if available, otherwise let DB generate it
    if (messageData.id) {
      insertValues.id = messageData.id;
    }
    
    const [newMessage] = await db
      .insert(chatMessage)
      .values(insertValues)
      .returning();

    // Update conversation last message
    await db
      .update(conversation)
      .set({
        lastMessageAt: new Date(messageData.timestamp),
        lastMessagePreview:
          messageData.content || (messageData.mediaUrl ? "Media" : ""),
        updatedAt: new Date(),
      })
      .where(eq(conversation.id, messageData.conversationId));

    return newMessage;
  } catch (error) {
    console.error("[Message Queue] Error persisting message to database:", error);
    throw error;
  }
}

/**
 * Process a single queued message with retry logic
 * @param messageId - The stream ID of the message
 * @param messageData - The message data
 * @returns true if successful, false otherwise
 */
async function processSingleMessage(
  messageId: string,
  messageData: QueuedMessage
): Promise<boolean> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Wait for exponential backoff (except first attempt)
      if (attempt > 0) {
        const delay = RETRY_DELAYS[attempt] || 8000;
        console.log(
          `[Message Queue] Retry attempt ${attempt + 1}/${MAX_RETRIES} after ${delay}ms delay`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      // Persist to database
      const savedMessage = await persistMessageToDatabase(messageData);
      if (!savedMessage) {
        throw new Error("Failed to save message to database");
      }

      // Normalize createdAt to ISO string for consistent format
      const normalizedMessage = {
        ...savedMessage,
        createdAt: savedMessage.createdAt instanceof Date 
          ? savedMessage.createdAt.toISOString() 
          : typeof savedMessage.createdAt === 'string'
          ? savedMessage.createdAt
          : new Date(messageData.timestamp).toISOString(),
      };

      // Publish to Redis pub/sub for real-time updates
      await publishMessage(messageData.conversationId, normalizedMessage);

      // Acknowledge the message
      await acknowledgeMessage(getStreamClient(), messageId);

      console.log(
        `[Message Queue] Successfully processed message ${messageId} (attempt ${attempt + 1})`
      );
      return true;
    } catch (error) {
      lastError = error as Error;
      console.error(
        `[Message Queue] Attempt ${attempt + 1}/${MAX_RETRIES} failed for message ${messageId}:`,
        error
      );

      // If it's a validation error or invalid data, don't retry
      if (
        error instanceof Error &&
        (error.message.includes("violates") ||
          error.message.includes("invalid") ||
          error.message.includes("constraint"))
      ) {
        console.error(
          `[Message Queue] Invalid message data, skipping retries for ${messageId}`
        );
        // Still acknowledge to remove from queue
        try {
          await acknowledgeMessage(getStreamClient(), messageId);
        } catch (ackError) {
          console.error("[Message Queue] Error acknowledging invalid message:", ackError);
        }
        return false;
      }
    }
  }

  // All retries failed
  console.error(
    `[Message Queue] Failed to process message ${messageId} after ${MAX_RETRIES} attempts. Last error:`,
    lastError
  );
  // Acknowledge anyway to prevent infinite retries (could move to dead letter queue here)
  try {
    await acknowledgeMessage(getStreamClient(), messageId);
  } catch (ackError) {
    console.error("[Message Queue] Error acknowledging failed message:", ackError);
  }
  return false;
}

/**
 * Process queued messages from Redis Stream
 * @param batchSize - Number of messages to process in one batch (default: 10)
 * @returns Number of messages processed
 */
export async function processQueuedMessages(
  batchSize: number = 10
): Promise<number> {
  const streamClient = getStreamClient();
  let processedCount = 0;

  try {
    // Ensure consumer group exists
    await createMessageConsumerGroup(streamClient);

    // Read messages from stream
    const messages = await readQueuedMessages(streamClient, batchSize);

    if (messages.length === 0) {
      return 0;
    }

    console.log(`[Message Queue] Processing ${messages.length} queued messages`);

    // Process each message
    for (const { id, message } of messages) {
      try {
        const success = await processSingleMessage(id, message);
        if (success) {
          processedCount++;
        }
      } catch (error) {
        console.error(`[Message Queue] Error processing message ${id}:`, error);
      }
    }

    console.log(
      `[Message Queue] Processed ${processedCount}/${messages.length} messages successfully`
    );
  } catch (error) {
    console.error("[Message Queue] Error in processQueuedMessages:", error);
  } finally {
    // Close the stream client
    await streamClient.quit();
  }

  return processedCount;
}

/**
 * Fallback: Save message directly to database if Redis queue fails
 * This provides graceful degradation
 * @param messageData - The message data to save
 * @returns The created message object or null if failed
 */
export async function saveMessageDirectly(
  messageData: QueuedMessage
): Promise<typeof chatMessage.$inferSelect | null> {
  try {
    console.log(
      "[Message Queue] Falling back to direct database save for message"
    );
    return await persistMessageToDatabase(messageData);
  } catch (error) {
    console.error("[Message Queue] Error in direct save fallback:", error);
    return null;
  }
}
