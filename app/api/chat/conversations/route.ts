import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { conversation, creator, user, chatMessage } from "@/lib/db/schema";
import { eq, or, desc } from "drizzle-orm";

// GET - List user's conversations
export async function GET(request: NextRequest) {
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

    const userId = session.user.id;

    // Get conversations where user is creator or fan
    const conversations = await db.query.conversation.findMany({
      where: (c, { eq: eqOp, or: orOp }) =>
        orOp(
          eqOp(c.creatorId, userId),
          eqOp(c.fanId, userId)
        ),
      orderBy: [desc(conversation.lastMessageAt)],
      limit: 50,
    });

    // Enrich with participant info
    const enriched = await Promise.all(
      conversations.map(async (conv) => {
        const otherUserId = conv.creatorId === userId ? conv.fanId : conv.creatorId;
        const isCreator = conv.creatorId === userId;

        // Get other participant info
        let otherParticipant;
        if (isCreator) {
          // Fan info
          const fanRecord = await db.query.user.findFirst({
            where: (u, { eq: eqOp }) => eqOp(u.id, otherUserId),
          });
          otherParticipant = {
            id: fanRecord?.id,
            name: fanRecord?.name,
            image: fanRecord?.image,
            role: "fan",
          };
        } else {
          // Creator info
          const creatorRecord = await db.query.creator.findFirst({
            where: (c, { eq: eqOp }) => eqOp(c.id, otherUserId),
          });
          const userRecord = await db.query.user.findFirst({
            where: (u, { eq: eqOp }) => eqOp(u.id, otherUserId),
          });
          otherParticipant = {
            id: creatorRecord?.id,
            name: creatorRecord?.displayName || userRecord?.name,
            image: creatorRecord?.profileImageUrl || userRecord?.image,
            username: creatorRecord?.username,
            role: "creator",
          };
        }

        // Get unread count
        const unreadMessages = await db.query.chatMessage.findMany({
          where: (m, { eq: eqOp, and: andOp, isNull }) =>
            andOp(
              eqOp(m.conversationId, conv.id),
              eqOp(m.senderId, otherUserId), // Messages from other participant
              isNull(m.readAt)
            ),
        });

        return {
          id: conv.id,
          otherParticipant,
          lastMessageAt: conv.lastMessageAt,
          lastMessagePreview: conv.lastMessagePreview,
          unreadCount: unreadMessages.length,
          createdAt: conv.createdAt,
        };
      })
    );

    return NextResponse.json({ conversations: enriched });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

