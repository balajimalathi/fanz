import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { InboxPageClient } from "./message-client";
import { checkBannedUser } from "@/lib/utils/check-banned-user";

export default async function InboxPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  // Check if user is banned (redirects to /suspended if banned)
  await checkBannedUser()

  // Check if user has creator role
  if (session.user.role !== "creator") {
    redirect("/home");
  }

  return <InboxPageClient creatorId={session.user.id} currentUserId={session.user.id} />;
}

