import { ChatWindow } from "@/components/chat/chat-window";
import { ConversationList } from "@/components/chat/conversation-list";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { conversation, creator, user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  const { conversationId } = await params;
  const userId = session.user.id;

  // Get conversation
  const conv = await db.query.conversation.findFirst({
    where: (c, { eq: eqOp }) => eqOp(c.id, conversationId),
  });

  if (!conv) {
    return <div>Conversation not found</div>;
  }

  // Verify user is part of conversation
  if (conv.creatorId !== userId && conv.fanId !== userId) {
    return <div>Access denied</div>;
  }

  // Get other participant info
  const otherUserId = conv.creatorId === userId ? conv.fanId : conv.creatorId;
  const isCreator = conv.creatorId === userId;

  let otherParticipant;
  if (isCreator) {
    const fanRecord = await db.query.user.findFirst({
      where: (u, { eq: eqOp }) => eqOp(u.id, otherUserId),
    });
    otherParticipant = {
      id: fanRecord?.id || otherUserId,
      name: fanRecord?.name || "Unknown",
      image: fanRecord?.image || null,
    };
  } else {
    const creatorRecord = await db.query.creator.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, otherUserId),
    });
    const userRecord = await db.query.user.findFirst({
      where: (u, { eq: eqOp }) => eqOp(u.id, otherUserId),
    });
    otherParticipant = {
      id: creatorRecord?.id || otherUserId,
      name: creatorRecord?.displayName || userRecord?.name || "Unknown",
      image: creatorRecord?.profileImageUrl || userRecord?.image || null,
    };
  }

  return (
    <div className="container mx-auto h-screen flex">
      <div className="w-1/3 border-r">
        <div className="h-full flex flex-col">
          <div className="border-b p-4">
            <Link href="/chat" className="text-sm text-muted-foreground hover:text-foreground">
              ← Back
            </Link>
            <h1 className="text-xl font-bold mt-2">Messages</h1>
          </div>
          <ConversationList
            onSelectConversation={(id) => {
              // Will be handled by navigation
            }}
            selectedConversationId={conversationId}
          />
        </div>
      </div>
      <div className="flex-1">
        <ChatWindow conversationId={conversationId} otherParticipant={otherParticipant} />
      </div>
    </div>
  );
}

