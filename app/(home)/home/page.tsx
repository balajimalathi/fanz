import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/client"
import { creator, user } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { ServiceOrdersList } from "@/components/home/service-orders-list"

export default async function HomePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect("/login")
  }

  // Check if user has creator role, if not set it
  if (session.user.role !== "creator") {
    // Update user role to creator
    await db
      .update(user)
      .set({ role: "creator" })
      .where(eq(user.id, session.user.id))
  }

  // Get creator record
  const creatorRecord = await db.query.creator.findFirst({
    where: (c, { eq: eqOp }) => eqOp(c.id, session.user.id),
  })

  // If creator record doesn't exist, create it
  if (!creatorRecord) {
    await db.insert(creator).values({
      id: session.user.id,
      displayName: session.user.name || "",
      onboardingStep: 0,
      onboardingData: {},
    })
    // Redirect to onboarding
    redirect("/onboarding")
  }

  // If not onboarded, redirect to onboarding
  if (!creatorRecord.onboarded) {
    redirect("/onboarding")
  }

  return (
    <div className="p-4">
      <ServiceOrdersList />
    </div>
  )
}
