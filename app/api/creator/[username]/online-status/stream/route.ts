import { NextRequest } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { CreatorOnlineStatusService } from "@/lib/services/creator-online-status-service";
import { db } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { creator } from "@/lib/db/schema";

/**
 * SSE endpoint for fans to listen to a specific creator's online status
 * Streams status updates in real-time
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { username } = await params;

  // Resolve username to creatorId
  const creatorRecord = await db.query.creator.findFirst({
    where: (c, { eq: eqOp }) => eqOp(c.username, username.toLowerCase()),
    columns: {
      id: true,
    },
  });

  if (!creatorRecord) {
    return new Response("Creator not found", { status: 404 });
  }

  const creatorId = creatorRecord.id;

  // Create SSE stream
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const sendEvent = (data: object) => {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      // Send initial status
      const isOnline = await CreatorOnlineStatusService.isCreatorOnline(creatorId);
      const lastSeenAt = await CreatorOnlineStatusService.getLastSeenAt(creatorId);
      sendEvent({
        type: "status",
        isOnline,
        lastSeenAt: lastSeenAt?.toISOString() || null,
      });

      // Poll database periodically for status changes
      // In a production system, you'd use Redis pub/sub or similar for real-time updates
      const pollInterval = setInterval(async () => {
        try {
          const currentIsOnline = await CreatorOnlineStatusService.isCreatorOnline(creatorId);
          const currentLastSeenAt = await CreatorOnlineStatusService.getLastSeenAt(creatorId);
          
          sendEvent({
            type: "status",
            isOnline: currentIsOnline,
            lastSeenAt: currentLastSeenAt?.toISOString() || null,
          });
        } catch (error) {
          console.error("Error polling creator status:", error);
          clearInterval(pollInterval);
          controller.close();
        }
      }, 5000); // Poll every 5 seconds (much better than 30s polling)

      // Handle connection close
      request.signal.addEventListener("abort", () => {
        clearInterval(pollInterval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  });
}
