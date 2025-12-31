import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db/client";
import { conversation, creator } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { FanConversationPageClient } from "./fan-conversation-client";

export default async function FanConversationPage({
  params,
}: {
  params: Promise<{ username: string; conversationId: string }>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  const { username, conversationId } = await params;

  // Verify conversation exists and belongs to fan
  const conv = await db.query.conversation.findFirst({
    where: (c, { eq: eqOp }) => eqOp(c.id, conversationId),
  });

  if (!conv) {
    notFound();
  }

  if (conv.fanId !== session.user.id) {
    redirect(`/u/${username}/messages`);
  }

  // Verify username matches creator
  const creatorRecord = await db.query.creator.findFirst({
    where: (c, { eq: eqOp }) => eqOp(c.id, conv.creatorId),
  });

  if (!creatorRecord || creatorRecord.username?.toLowerCase() !== username.toLowerCase()) {
    notFound();
  }

  // Get creator user details
  const creatorUser = await db.query.user.findFirst({
    where: (u, { eq: eqOp }) => eqOp(u.id, conv.creatorId),
  });

  if (!creatorUser) {
    notFound();
  }

  return (
    <FanConversationPageClient
      conversationId={conversationId}
      currentUserId={session.user.id}
      otherUserId={conv.creatorId}
      otherUserName={creatorRecord.displayName}
      otherUserImage={creatorUser.image}
    />
  );
}

