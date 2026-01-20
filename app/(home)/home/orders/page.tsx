import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/client"
import { creator } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { CreatorOrdersList } from "@/components/orders/creator-orders-list"

export const dynamic = "force-dynamic"

export default async function CreatorOrdersPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect("/login")
  }

  // Verify user is a creator
  const creatorRecord = await db.query.creator.findFirst({
    where: (c, { eq: eqOp }) => eqOp(c.id, session.user.id),
  })

  if (!creatorRecord) {
    redirect("/")
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Service Orders</h1>
        <p className="text-muted-foreground">
          Manage and fulfill your service orders
        </p>
      </div>
      <CreatorOrdersList />
    </div>
  )
}
