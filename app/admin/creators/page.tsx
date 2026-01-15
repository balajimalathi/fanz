import { requireAdmin } from "@/lib/utils/admin-auth"
import { redirect } from "next/navigation"
import { CreatorApprovalTable } from "@/components/admin/creator-approval-table"

export default async function AdminCreatorsPage() {
  const adminUser = await requireAdmin()

  if (!adminUser) {
    redirect("/home")
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Creator Management</h1>
        <p className="text-muted-foreground">
          Review and approve creator applications
        </p>
      </div>

      <CreatorApprovalTable />
    </div>
  )
}

