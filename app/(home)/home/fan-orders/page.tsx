import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { FanOrdersList } from "@/components/orders/fan-orders-list"

export const dynamic = "force-dynamic"

export default async function OrdersPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect("/login")
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">My Orders</h1>
        <p className="text-muted-foreground">
          View and manage your service orders
        </p>
      </div>
      <FanOrdersList />
    </div>
  )
}
