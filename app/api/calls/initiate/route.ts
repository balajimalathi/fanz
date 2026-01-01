import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { conversation, call, user } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { generateAccessToken } from "@/lib/livekit/token";
import { env } from "@/env";
import { publishCallEvent } from "@/lib/utils/redis-pubsub";
import { sendPushNotificationsToUsers } from "@/lib/push/fcm";

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
    const { conversationId, callType = "audio" } = body;

    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId is required" },
        { status: 400 }
      );
    }

    if (callType !== "audio" && callType !== "video") {
      return NextResponse.json(
        { error: "callType must be 'audio' or 'video'" },
        { status: 400 }
      );
    }

    // Validate user has access to this conversation
    const conv = await db.query.conversation.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, conversationId),
    });

    if (!conv) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Check if user is either creator or fan
    const isCreator = conv.creatorId === session.user.id;
    const isFan = conv.fanId === session.user.id;

    if (!isCreator && !isFan) {
      return NextResponse.json(
        { error: "Forbidden: You don't have access to this conversation" },
        { status: 403 }
      );
    }

    // Determine caller and receiver
    const callerId = session.user.id;
    const receiverId = isCreator ? conv.fanId : conv.creatorId;

    console.log("[Call Initiate] Checking for existing calls", {
      conversationId,
      callerId,
      receiverId,
    });

    // Check if there's already an active call for this conversation
    // Active calls are those with status: initiated, ringing, or accepted
    const activeStatuses = ["initiated", "ringing", "accepted"] as const;
    
    // Use select with where clause to find active calls
    const existingCalls = await db
      .select()
      .from(call)
      .where(
        eq(call.conversationId, conversationId)
      );

    const activeCall = existingCalls.find((c) => 
      activeStatuses.includes(c.status as typeof activeStatuses[number])
    );

    console.log("[Call Initiate] Active call check", {
      totalCallsFound: existingCalls.length,
      callStatuses: existingCalls.map(c => ({ id: c.id, status: c.status })),
      activeCall: activeCall ? { id: activeCall.id, status: activeCall.status } : null,
    });

    // If there's an active call, end it before starting a new one
    if (activeCall) {
      console.log("[Call Initiate] Ending existing active call before starting new one", {
        callId: activeCall.id,
        status: activeCall.status,
        existingCallerId: activeCall.callerId,
        existingReceiverId: activeCall.receiverId,
      });
      
      // Update existing call to ended status
      await db
        .update(call)
        .set({
          status: "ended",
          endedAt: new Date(),
        })
        .where(eq(call.id, activeCall.id));

      // Notify the other participant that the old call was ended
      const otherParticipantId = activeCall.callerId === callerId 
        ? activeCall.receiverId 
        : activeCall.callerId;
      
      if (otherParticipantId) {
        const endedEvent = {
          type: "call_ended" as const,
          callId: activeCall.id,
          conversationId: activeCall.conversationId || undefined,
          callerId: activeCall.callerId,
          receiverId: activeCall.receiverId,
          callType: activeCall.callType as "audio" | "video",
          status: "ended",
          timestamp: Date.now(),
        };
        
        console.log("[Call Initiate] Publishing call_ended event for old call", {
          otherParticipantId,
          oldCallId: activeCall.id,
        });
        
        await publishCallEvent(otherParticipantId, endedEvent);
      }

      console.log("[Call Initiate] Existing call ended, proceeding with new call");
    }

    // Get user names for notifications
    const callerUser = await db.query.user.findFirst({
      where: (u, { eq: eqOp }) => eqOp(u.id, callerId),
    });

    const receiverUser = await db.query.user.findFirst({
      where: (u, { eq: eqOp }) => eqOp(u.id, receiverId),
    });

    const callerName = callerUser?.name || session.user.email || "Unknown";
    const receiverName = receiverUser?.name || "Unknown";

    // Use conversation ID as LiveKit room name
    const livekitRoomName = conversationId;

    console.log("[Call Initiate] Creating call record", {
      conversationId,
      callerId,
      receiverId,
      callType,
      livekitRoomName,
    });

    // Create call record
    const [newCall] = await db
      .insert(call)
      .values({
        conversationId,
        callerId,
        receiverId,
        callType: callType as "audio" | "video",
        status: "initiated",
        livekitRoomName,
      })
      .returning();

    console.log("[Call Initiate] Call record created", {
      callId: newCall.id,
      status: newCall.status,
    });

    // Update status to ringing
    await db
      .update(call)
      .set({ status: "ringing" })
      .where(eq(call.id, newCall.id));

    console.log("[Call Initiate] Call status updated to ringing");

    // Generate LiveKit token for caller
    const token = await generateAccessToken({
      roomName: livekitRoomName,
      participantIdentity: callerId,
      participantName: callerName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    // Publish call event to Redis for receiver
    const callEvent = {
      type: "incoming_call" as const,
      callId: newCall.id,
      conversationId,
      callerId,
      receiverId,
      callType: callType as "audio" | "video",
      status: "ringing",
      timestamp: Date.now(),
    };

    console.log("[Call Initiate] Publishing call event", {
      receiverId,
      callId: newCall.id,
    });

    await publishCallEvent(receiverId, callEvent);

    // Send push notification to receiver
    console.log("[Call Initiate] Sending push notification", {
      receiverId,
      callerName,
    });

    await sendPushNotificationsToUsers([receiverId], {
      title: "Incoming Call",
      body: `${callerName} is calling you...`,
      data: {
        type: "incoming_call",
        callId: newCall.id,
        conversationId,
        callerId,
        callerName,
        callType,
      },
      click_action: `${env.NEXT_PUBLIC_APP_URL}/home/inbox`,
    });

    console.log("[Call Initiate] Call initiated successfully", {
      callId: newCall.id,
      roomName: livekitRoomName,
    });

    return NextResponse.json({
      call: {
        id: newCall.id,
        conversationId,
        callerId,
        receiverId,
        callType,
        status: "ringing",
        livekitRoomName,
      },
      token,
      url: env.NEXT_PUBLIC_LIVEKIT_URL,
      roomName: livekitRoomName,
    });
  } catch (error) {
    console.error("Error initiating call:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

