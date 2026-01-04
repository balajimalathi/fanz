import { requireAdmin } from "@/lib/utils/admin-auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db/client"
import { paymentTransaction } from "@/lib/db/schema"
import { eq, desc, and } from "drizzle-orm"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default async function AdminTransactionsPage() {
  const adminUser = await requireAdmin()

  if (!adminUser) {
    redirect("/home")
  }

  // Get recent transactions
  const transactions = await db
    .select()
    .from(paymentTransaction)
    .orderBy(desc(paymentTransaction.createdAt))
    .limit(100)

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default"
      case "processing":
        return "secondary"
      case "pending":
        return "outline"
      case "failed":
        return "destructive"
      default:
        return "outline"
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
        <p className="text-muted-foreground">
          View all payment transactions
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Last 100 transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Transaction ID</th>
                  <th className="text-left p-3 font-medium">Type</th>
                  <th className="text-left p-3 font-medium">Amount</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b hover:bg-muted/50">
                    <td className="p-3 text-sm font-mono">
                      {transaction.id.slice(0, 8)}...
                    </td>
                    <td className="p-3">
                      <Badge variant="outline">{transaction.type}</Badge>
                    </td>
                    <td className="p-3 text-sm font-medium">
                      ₹{(transaction.amount / 100).toLocaleString()}
                    </td>
                    <td className="p-3">
                      <Badge variant={getStatusBadgeVariant(transaction.status)}>
                        {transaction.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {new Date(transaction.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

