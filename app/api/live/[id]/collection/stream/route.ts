import { NextRequest } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { liveStream, liveStreamPurchase, paymentTransaction } from "@/lib/db/schema";
import { eq, and, gte, or, isNull } from "drizzle-orm";
import { sql } from "drizzle-orm";
import {
  createSubscriberClient,
  subscribeToCollectionUpdates,
  unsubscribeFromCollectionUpdates,
  closeSubscriberClient,
  CollectionUpdateEvent,
} from "@/lib/utils/redis-pubsub";
import { calculateStreamCollection } from "@/lib/services/live-stream-collection-service";

// GET - SSE stream endpoint for real-time collection updates
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

    const { id: streamId } = await params;

    // Verify user has access to this stream (creator or viewer)
    const stream = await db.query.liveStream.findFirst({
      where: (ls, { eq: eqOp }) => eqOp(ls.id, streamId),
    });

    if (!stream) {
      return new Response("Stream not found", { status: 404 });
    }

    // Check if user is creator or has joined the stream
    const hasAccess =
      stream.creatorId === session.user.id ||
      (await db.query.liveStreamPurchase.findFirst({
        where: (lsp, { eq: eqOp, and: andOp }) =>
          andOp(
            eqOp(lsp.liveStreamId, streamId),
            eqOp(lsp.userId, session.user.id)
          ),
      }));

    if (!hasAccess && stream.creatorId !== session.user.id) {
      return new Response("Forbidden", { status: 403 });
    }

    // Get creator currency (default to USD)
    const creator = await db.query.creator.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, stream.creatorId),
    });

    const currency = creator?.currency || "USD";

    // Create SSE stream
    const streamResponse = new ReadableStream({
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
              await unsubscribeFromCollectionUpdates(subscriber, streamId);
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
          sendEvent("connected", { streamId });

          // Calculate and send initial collection
          try {
            const initialCollection = await calculateStreamCollection(streamId, currency);
            sendEvent("collection_update", {
              total: initialCollection.total,
              currency,
              entryFees: initialCollection.entryFees,
              tips: initialCollection.tips,
            });
          } catch (error) {
            console.error("Error calculating initial collection:", error);
            sendEvent("collection_update", {
              total: 0,
              currency,
              entryFees: 0,
              tips: 0,
            });
          }

          // Create Redis subscriber
          try {
            subscriber = createSubscriberClient();

            // Subscribe to collection updates for this stream
            await subscribeToCollectionUpdates(
              subscriber,
              streamId,
              (event: CollectionUpdateEvent) => {
                try {
                  sendEvent("collection_update", {
                    total: event.total,
                    currency: event.currency,
                    entryFees: event.entryFees,
                    tips: event.tips,
                  });
                } catch (error) {
                  console.error("Error sending collection update via SSE:", error);
                }
              }
            );
          } catch (redisError) {
            console.error("Error setting up Redis subscription:", redisError);
            // Continue without Redis - client will still get initial collection
          }

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
            error: error instanceof Error ? error.message : "Unknown error",
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
      },
    });

    return new Response(streamResponse, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no", // Disable nginx buffering
      },
    });
  } catch (error) {
    console.error("Error in collection SSE stream:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
