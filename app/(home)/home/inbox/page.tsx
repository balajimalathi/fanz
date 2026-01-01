import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { InboxPageClient } from "./inbox-client";

export default async function InboxPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  // Check if user has creator role
  if (session.user.role !== "creator") {
    redirect("/home");
  }

  return <InboxPageClient creatorId={session.user.id} currentUserId={session.user.id} />;
}

