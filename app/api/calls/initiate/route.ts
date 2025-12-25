import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { call, conversation, creator, user } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getCallPermission } from "@/lib/utils/call-permissions";
import { sendToUser } from "@/lib/socketio/server";
import { sendPushNotificationsToUsers } from "@/lib/push/fcm";
import { env } from "@/env";
import { z } from "zod";
import { randomUUID } from "crypto";

const initiateCallSchema = z.object({
  receiverId: z.string(),
  callType: z.enum(["audio", "video"]),
  conversationId: z.string().uuid().optional(),
});

// POST - Initiate a call
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

    const body = await request.json();
    const validationResult = initiateCallSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { receiverId, callType, conversationId } = validationResult.data;
    const callerId = session.user.id;

    if (callerId === receiverId) {
      return NextResponse.json(
        { error: "Cannot call yourself" },
        { status: 400 }
      );
    }

    // Determine if caller is creator or fan
    const callerUser = await db.query.user.findFirst({
      where: (u, { eq: eqOp }) => eqOp(u.id, callerId),
    });

    const receiverUser = await db.query.user.findFirst({
      where: (u, { eq: eqOp }) => eqOp(u.id, receiverId),
    });

    if (!callerUser || !receiverUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check permissions: If caller is a fan calling a creator, verify subscription
    const callerIsCreator = callerUser.role === "creator";
    const receiverIsCreator = receiverUser.role === "creator";

    if (!callerIsCreator && receiverIsCreator) {
      // Fan calling creator - check subscription
      const permission = await getCallPermission(callerId, receiverId, true);
      if (!permission.canCall) {
        return NextResponse.json(
          { error: "You must be a subscriber to call this creator" },
          { status: 403 }
      );
      }
    }

    // Get or create conversation if conversationId not provided
    let convId = conversationId;
    if (!convId) {
      // Determine creator and fan
      const creatorId = callerIsCreator ? callerId : receiverId;
      const fanId = callerIsCreator ? receiverId : callerId;

      const existingConv = await db.query.conversation.findFirst({
        where: (c, { eq: eqOp, and: andOp }) =>
          andOp(
            eqOp(c.creatorId, creatorId),
            eqOp(c.fanId, fanId)
          ),
      });

      if (existingConv) {
        convId = existingConv.id;
      } else {
        // Create conversation
        const [newConv] = await db
          .insert(conversation)
          .values({
            creatorId,
            fanId,
          })
          .returning();
        convId = newConv.id;
      }
    } else {
      // Verify conversation exists and user is part of it
      const conv = await db.query.conversation.findFirst({
        where: (c, { eq: eqOp }) => eqOp(c.id, convId),
      });

      if (!conv || (conv.creatorId !== callerId && conv.fanId !== callerId)) {
        return NextResponse.json(
          { error: "Invalid conversation" },
          { status: 403 }
        );
      }
    }

    // Generate room name
    const roomName = `call-${randomUUID()}`;

    // Create call record
    const [newCall] = await db
      .insert(call)
      .values({
        conversationId: convId,
        callerId,
        receiverId,
        callType,
        status: "initiated",
        livekitRoomName: roomName,
      })
      .returning();

    // Send WebSocket notification to receiver
    const sent = sendToUser(receiverId, {
      type: "call:initiate",
      timestamp: Date.now(),
      messageId: newCall.id,
      payload: {
        callId: newCall.id,
        callType,
        receiverId,
        conversationId: convId,
      },
    });

    // Send push notification if receiver is offline
    if (!sent) {
      try {
        const callerName = callerIsCreator
          ? (await db.query.creator.findFirst({
              where: (c, { eq: eqOp }) => eqOp(c.id, callerId),
            }))?.displayName || callerUser.name
          : callerUser.name;

        await sendPushNotificationsToUsers([receiverId], {
          title: `Incoming ${callType} call`,
          body: `Call from ${callerName}`,
          data: {
            type: "call",
            callId: newCall.id,
            callType,
          },
        });
      } catch (error) {
        console.error("Failed to send push notification:", error);
      }
    }

    return NextResponse.json({
      success: true,
      call: newCall,
    });
  } catch (error) {
    console.error("Error initiating call:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

