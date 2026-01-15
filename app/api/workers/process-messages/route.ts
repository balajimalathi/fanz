import { NextRequest, NextResponse } from "next/server";
import { processQueuedMessages } from "@/lib/services/message-queue";

/**
 * Background worker endpoint to process queued messages
 * This can be called via:
 * - Cron job (e.g., every 5-10 seconds)
 * - Long-polling endpoint
 * - External scheduler
 * 
 * GET - Process a batch of messages
 * POST - Process messages with custom batch size
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const batchSize = parseInt(searchParams.get("batchSize") || "10", 10);

    const processedCount = await processQueuedMessages(batchSize);

    return NextResponse.json({
      success: true,
      processed: processedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Worker] Error processing messages:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process messages",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const batchSize = body.batchSize || 10;

    const processedCount = await processQueuedMessages(batchSize);

    return NextResponse.json({
      success: true,
      processed: processedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Worker] Error processing messages:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process messages",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
