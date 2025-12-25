import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { env } from "@/env";
import { z } from "zod";

// Only include LiveKit SDK if configured
let AccessToken: any = null;
let VideoGrant: any = null;

try {
  if (env.LIVEKIT_API_KEY && env.LIVEKIT_API_SECRET) {
    const livekit = require("livekit-server-sdk");
    AccessToken = livekit.AccessToken;
    VideoGrant = livekit.VideoGrant;
  }
} catch (error) {
  console.warn("LiveKit SDK not installed. Install with: pnpm add livekit-server-sdk");
}

const tokenSchema = z.object({
  roomName: z.string(),
  participantName: z.string(),
});

// POST - Generate LiveKit access token
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET || !env.LIVEKIT_URL) {
      return NextResponse.json(
        { error: "LiveKit is not configured" },
        { status: 503 }
      );
    }

    if (!AccessToken || !VideoGrant) {
      return NextResponse.json(
        { error: "LiveKit SDK not available" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const validationResult = tokenSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { roomName, participantName } = validationResult.data;

    // Create access token
    const token = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
      identity: participantName,
    });

    const grant = new VideoGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    });

    token.addGrant(grant);

    const jwt = await token.toJwt();

    return NextResponse.json({
      token: jwt,
      url: env.LIVEKIT_URL,
    });
  } catch (error) {
    console.error("Error generating LiveKit token:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

