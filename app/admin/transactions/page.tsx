import { requireAdmin } from "@/lib/utils/admin-auth"
import { redirect } from "next/navigation"
import { TransactionsTable } from "@/components/admin/transactions-table"

export default async function AdminTransactionsPage() {
  const adminUser = await requireAdmin()

  if (!adminUser) {
    redirect("/home")
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
        <p className="text-muted-foreground">
          View all payment transactions
        </p>
      </div>

      <TransactionsTable />
    </div>
  )
}

