import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/client"
import { creator } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { CreatorManagementPage } from "@/components/creator/creator-management-page"

export default async function MyAppPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect("/login")
  }

  // Get creator record
  const creatorRecord = await db.query.creator.findFirst({
    where: (c, { eq: eqOp }) => eqOp(c.id, session.user.id),
  })

  if (!creatorRecord) {
    redirect("/onboarding")
  }

  if (!creatorRecord.onboarded) {
    redirect("/onboarding")
  }

  return (
    <div className="space-y-6 p-4 pb-20 md:pb-4 lg:pb-4">
      <div>
        <h1 className="text-3xl font-bold">My App</h1>
        <p className="text-muted-foreground">
          Manage your profile and services
        </p>
      </div>
      
      <CreatorManagementPage 
        creatorId={session.user.id}
        displayName={creatorRecord.displayName}
        username={creatorRecord.username || undefined}
        bio={creatorRecord.bio || undefined}
      />
    </div>
  )
}
