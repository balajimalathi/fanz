import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { creator } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { MessagesListClient } from "./messages-list-client";

async function getCreatorByUsername(username: string) {
  const creatorRecord = await db.query.creator.findFirst({
    where: (c, { eq: eqOp }) => eqOp(c.username, username.toLowerCase()),
  });

  return creatorRecord;
}

export default async function MessagesPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  const { username } = await params;
  const creatorRecord = await getCreatorByUsername(username);

  if (!creatorRecord || !creatorRecord.onboarded) {
    notFound();
  }

  return <MessagesListClient fanId={session.user.id} />;
}

