import { NextRequest } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { liveStream } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  createSubscriberClient,
  subscribeToLiveStreamEvents,
  unsubscribeFromLiveStreamEvents,
  closeSubscriberClient,
  LiveStreamEvent,
} from "@/lib/utils/redis-pubsub";

// GET - SSE stream endpoint for real-time live stream status updates
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ creatorId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { creatorId } = await params;

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
              await unsubscribeFromLiveStreamEvents(subscriber, creatorId);
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
          // Send connection confirmation immediately
          sendEvent("connected", { creatorId });

          // Create Redis subscriber first
          try {
            subscriber = createSubscriberClient();

            // Subscribe to live stream events for this creator
            await subscribeToLiveStreamEvents(
              subscriber,
              creatorId,
              (liveStreamEvent: LiveStreamEvent) => {
                try {
                  if (liveStreamEvent.type === "stream_started") {
                    sendEvent("stream_started", {
                      stream: {
                        id: liveStreamEvent.streamId,
                        streamType: liveStreamEvent.streamType,
                        price: liveStreamEvent.price,
                      },
                    });
                  } else if (liveStreamEvent.type === "stream_ended") {
                    sendEvent("stream_ended", { stream: null });
                  }
                } catch (error) {
                  console.error("Error sending live stream event via SSE:", error);
                }
              }
            );
          } catch (redisError) {
            console.error("Error setting up Redis subscription:", redisError);
            sendEvent("error", { 
              message: "Failed to establish Redis connection",
              error: redisError instanceof Error ? redisError.message : "Unknown error"
            });
            // Continue without Redis - client will still get initial status
          }

          // Fetch and send initial stream status (async, after connection is established)
          (async () => {
            try {
              const activeStream = await db.query.liveStream.findFirst({
                where: (ls, { eq: eqOp, and: andOp }) =>
                  andOp(
                    eqOp(ls.creatorId, creatorId),
                    eqOp(ls.status, "active")
                  ),
              });

              if (activeStream) {
                sendEvent("stream_status", {
                  stream: {
                    id: activeStream.id,
                    streamType: activeStream.streamType,
                    price: activeStream.price ? activeStream.price / 100 : null,
                  },
                });
              } else {
                sendEvent("stream_status", { stream: null });
              }
            } catch (dbError) {
              console.error("Error fetching initial stream status:", dbError);
              sendEvent("stream_status", { stream: null });
            }
          })();

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
          console.error("Error setting up SSE stream:", error);
          sendEvent("error", { 
            message: "Failed to establish connection",
            error: error instanceof Error ? error.message : "Unknown error"
          });
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
    console.error("Error in live stream events SSE stream:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
