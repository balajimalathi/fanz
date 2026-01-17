import { NextRequest } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { CreatorOnlineStatusService } from "@/lib/services/creator-online-status-service";

/**
 * SSE endpoint for creators to maintain their online status
 * Connection open = online, connection closed = offline
 */
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Check if user has creator role
  if (session.user.role !== "creator") {
    return new Response("Forbidden: Creator role required", { status: 403 });
  }

  const creatorId = session.user.id;

  // Create SSE stream
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // Mark creator as online when connection opens
      await CreatorOnlineStatusService.updateOnlineStatus(creatorId, true);

      // Send initial connection confirmation
      const sendEvent = (data: object) => {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      sendEvent({ type: "connected", isOnline: true });

      // Send periodic heartbeat to keep connection alive and update lastSeenAt
      const heartbeatInterval = setInterval(async () => {
        try {
          await CreatorOnlineStatusService.updateOnlineStatus(creatorId, true);
          sendEvent({ type: "heartbeat", timestamp: new Date().toISOString() });
        } catch (error) {
          console.error("Error in heartbeat:", error);
          clearInterval(heartbeatInterval);
          controller.close();
        }
      }, 30000); // Every 30 seconds

      // Handle connection close
      request.signal.addEventListener("abort", async () => {
        clearInterval(heartbeatInterval);
        // Mark creator as offline when connection closes
        await CreatorOnlineStatusService.updateOnlineStatus(creatorId, false);
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
