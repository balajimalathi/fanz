import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { AccessToken } from "livekit-server-sdk";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { serviceOrder, service, creator } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { env } from "@/env";
import {
  getChatRoomName,
  getCallRoomName,
  getLivestreamRoomName,
  getPresenceRoomName,
  canPublish,
  canSubscribe,
} from "@/lib/livekit/rooms";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { roomType, serviceOrderId, creatorUsername } = body;

    if (!roomType) {
      return NextResponse.json(
        { error: "roomType is required" },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    const userRole = session.user.role === "creator" ? "creator" : "fan";

    let roomName: string;
    let canPub = false;
    let canSub = false;

    // Handle different room types
    switch (roomType) {
      case "presence": {
        // Presence room - everyone can join their own
        roomName = getPresenceRoomName(userId);
        canPub = true;
        canSub = true;
        break;
      }

      case "chat":
      case "call": {
        // Chat and call require active service order
        if (!serviceOrderId) {
          return NextResponse.json(
            { error: "serviceOrderId is required for chat/call" },
            { status: 400 }
          );
        }

        // Validate service order exists and is active
        const order = await db.query.serviceOrder.findFirst({
          where: (so, { eq: eqOp }) => eqOp(so.id, serviceOrderId),
        });

        if (!order) {
          return NextResponse.json(
            { error: "Service order not found" },
            { status: 404 }
          );
        }

        if (order.status !== "active") {
          return NextResponse.json(
            { error: "Service order is not active" },
            { status: 400 }
          );
        }

        // Verify user is part of this service order
        if (userRole === "creator" && order.creatorId !== userId) {
          return NextResponse.json(
            { error: "Unauthorized: Not your service order" },
            { status: 403 }
          );
        }

        if (userRole === "fan" && order.userId !== userId) {
          return NextResponse.json(
            { error: "Unauthorized: Not your service order" },
            { status: 403 }
          );
        }

        // Generate room name
        if (roomType === "chat") {
          roomName = getChatRoomName(serviceOrderId);
        } else {
          roomName = getCallRoomName(serviceOrderId);
        }

        const isOwner = userRole === "creator";
        canPub = canPublish(userRole, roomType, isOwner);
        canSub = canSubscribe(userRole, roomType);
        break;
      }

      case "livestream": {
        // Livestream doesn't require service order
        if (!creatorUsername) {
          return NextResponse.json(
            { error: "creatorUsername is required for livestream" },
            { status: 400 }
          );
        }

        // Verify creator exists
        const creatorRecord = await db.query.creator.findFirst({
          where: (c, { eq: eqOp }) => eqOp(c.username, creatorUsername.toLowerCase()),
        });

        if (!creatorRecord) {
          return NextResponse.json(
            { error: "Creator not found" },
            { status: 404 }
          );
        }

        roomName = getLivestreamRoomName(creatorUsername);
        const isOwner = userRole === "creator" && creatorRecord.id === userId;
        canPub = canPublish(userRole, roomType, isOwner);
        canSub = canSubscribe(userRole, roomType);
        break;
      }

      default:
        return NextResponse.json(
          { error: "Invalid roomType" },
          { status: 400 }
        );
    }

    // Create access token
    const token = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
      identity: userId,
      name: session.user.name || userId,
    });

    // Grant permissions
    const grant = {
      room: roomName,
      roomJoin: true,
      canPublish: canPub,
      canSubscribe: canSub,
    };

    token.addGrant(grant);

    // Set token expiration (1 hour)
    token.setIdentity(userId);
    token.setName(session.user.name || userId);
    token.setValidFor("1h");

    const jwt = await token.toJwt();

    return NextResponse.json({
      token: jwt,
      roomName,
      canPublish: canPub,
      canSubscribe: canSub,
    });
  } catch (error) {
    console.error("Error generating LiveKit token:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

