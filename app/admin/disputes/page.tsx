import { requireAdmin } from "@/lib/utils/admin-auth"
import { redirect } from "next/navigation"
import { DisputesTable } from "@/components/admin/disputes-table"

export default async function AdminDisputesPage() {
  const adminUser = await requireAdmin()

  if (!adminUser) {
    redirect("/home")
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Disputes</h1>
        <p className="text-muted-foreground">
          Review and resolve transaction disputes
        </p>
      </div>

      <DisputesTable />
    </div>
  )
}

