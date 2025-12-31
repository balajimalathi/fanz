import { NextRequest } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { conversation } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  createSubscriberClient,
  subscribeToConversation,
  unsubscribeFromConversation,
  subscribeToTypingEvents,
  unsubscribeFromTypingEvents,
  closeSubscriberClient,
} from "@/lib/utils/redis-pubsub";

// GET - SSE stream endpoint for real-time messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { id: conversationId } = await params;
    const userId = session.user.id;

    // Verify conversation exists and user has access
    const conv = await db.query.conversation.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, conversationId),
    });

    if (!conv) {
      return new Response("Conversation not found", { status: 404 });
    }

    if (conv.creatorId !== userId && conv.fanId !== userId) {
      return new Response("Forbidden", { status: 403 });
    }

    // Create SSE stream
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let subscriber: ReturnType<typeof createSubscriberClient> | null = null;
        let heartbeatInterval: NodeJS.Timeout | null = null;

        // Send initial connection message
        const sendEvent = (event: string, data: unknown) => {
          try {
            const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
            controller.enqueue(encoder.encode(message));
          } catch (error) {
            console.error("Error sending SSE event:", error);
          }
        };

        // Cleanup function
        const cleanup = async () => {
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
          }
          if (subscriber) {
            try {
              await unsubscribeFromConversation(subscriber, conversationId);
              await unsubscribeFromTypingEvents(subscriber, conversationId);
              await closeSubscriberClient(subscriber);
            } catch (error) {
              console.error("Error cleaning up Redis subscriber:", error);
            }
            subscriber = null;
          }
          try {
            controller.close();
          } catch (error) {
            // Stream may already be closed
          }
        };

        try {
          // Create Redis subscriber
          subscriber = createSubscriberClient();

          // Subscribe to conversation channel for messages
          await subscribeToConversation(
            subscriber,
            conversationId,
            (message) => {
              try {
                sendEvent("message", message);
              } catch (error) {
                console.error("Error sending message via SSE:", error);
              }
            }
          );

          // Subscribe to typing events
          await subscribeToTypingEvents(
            subscriber,
            conversationId,
            (typingEvent) => {
              try {
                // Only send typing event if it's from the other user
                if (typingEvent.userId !== userId) {
                  sendEvent("typing", typingEvent);
                }
              } catch (error) {
                console.error("Error sending typing event via SSE:", error);
              }
            }
          );

          // Send connection confirmation
          sendEvent("connected", { conversationId });

          // Send heartbeat to keep connection alive
          heartbeatInterval = setInterval(() => {
            try {
              sendEvent("heartbeat", { timestamp: Date.now() });
            } catch (error) {
              console.error("Error sending heartbeat:", error);
              if (heartbeatInterval) {
                clearInterval(heartbeatInterval);
                heartbeatInterval = null;
              }
            }
          }, 30000); // Every 30 seconds
        } catch (error) {
          console.error("Error setting up Redis subscription:", error);
          sendEvent("error", { message: "Failed to establish connection" });
          await cleanup();
        }

        // Handle client disconnect
        request.signal.addEventListener("abort", () => {
          cleanup();
        });
      },
      cancel() {
        // Handle stream cancellation
        // Cleanup is handled in the abort event listener
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no", // Disable nginx buffering
      },
    });
  } catch (error) {
    console.error("Error in SSE stream:", error);
    return new Response("Internal server error", { status: 500 });
  }
}

