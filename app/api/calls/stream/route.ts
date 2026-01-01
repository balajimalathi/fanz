import { NextRequest } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import {
  createSubscriberClient,
  subscribeToCallEvents,
  unsubscribeFromCallEvents,
  closeSubscriberClient,
  CallEvent,
} from "@/lib/utils/redis-pubsub";

// GET - SSE stream endpoint for real-time call events
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const userId = session.user.id;

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
              await unsubscribeFromCallEvents(subscriber, userId);
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

          // Subscribe to call events for this user
          await subscribeToCallEvents(
            subscriber,
            userId,
            (callEvent: CallEvent) => {
              try {
                // Map call event type to SSE event type
                let eventType = "call";
                if (callEvent.type === "incoming_call") {
                  eventType = "incoming_call";
                } else if (callEvent.type === "call_accepted") {
                  eventType = "call_accepted";
                } else if (callEvent.type === "call_rejected") {
                  eventType = "call_rejected";
                } else if (callEvent.type === "call_ended") {
                  eventType = "call_ended";
                } else if (callEvent.type === "call_missed") {
                  eventType = "call_missed";
                }

                sendEvent(eventType, callEvent);
              } catch (error) {
                console.error("Error sending call event via SSE:", error);
              }
            }
          );

          // Send connection confirmation
          sendEvent("connected", { userId });

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
    console.error("Error in call events SSE stream:", error);
    return new Response("Internal server error", { status: 500 });
  }
}

