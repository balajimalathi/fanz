import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { requireAdmin } from "@/lib/utils/admin-auth"
import { db } from "@/lib/db/client"
import { creator, user, report, dispute, paymentTransaction } from "@/lib/db/schema"
import { eq, and, count, sql } from "drizzle-orm"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Users, FileText, AlertTriangle, DollarSign, CheckCircle, XCircle } from "lucide-react"

export default async function AdminDashboardPage() {
  const adminUser = await requireAdmin()

  if (!adminUser) {
    redirect("/home")
  }

  // Get statistics
  const [
    pendingCreatorsCount,
    totalCreatorsCount,
    pendingReportsCount,
    openDisputesCount,
    totalRevenue,
    recentTransactionsCount,
  ] = await Promise.all([
    db
      .select({ count: count() })
      .from(creator)
      .where(eq(creator.onboarded, false)),
    db.select({ count: count() }).from(creator),
    db
      .select({ count: count() })
      .from(report)
      .where(eq(report.status, "pending")),
    db
      .select({ count: count() })
      .from(dispute)
      .where(eq(dispute.status, "open")),
    db
      .select({
        total: sql<number>`COALESCE(SUM(${paymentTransaction.amount}), 0)`,
      })
      .from(paymentTransaction)
      .where(eq(paymentTransaction.status, "completed")),
    db
      .select({ count: count() })
      .from(paymentTransaction)
      .where(
        and(
          eq(paymentTransaction.status, "completed"),
          sql`${paymentTransaction.createdAt} > NOW() - INTERVAL '7 days'`
        )!
      ),
  ])

  const stats = [
    {
      title: "Pending Creators",
      value: pendingCreatorsCount[0]?.count || 0,
      description: "Awaiting approval",
      icon: Users,
      href: "/home/admin/creators?status=pending",
      color: "text-yellow-600",
    },
    {
      title: "Total Creators",
      value: totalCreatorsCount[0]?.count || 0,
      description: "All creators",
      icon: CheckCircle,
      href: "/home/admin/creators",
      color: "text-blue-600",
    },
    {
      title: "Pending Reports",
      value: pendingReportsCount[0]?.count || 0,
      description: "Require review",
      icon: AlertTriangle,
      href: "/home/admin/reports",
      color: "text-red-600",
    },
    {
      title: "Open Disputes",
      value: openDisputesCount[0]?.count || 0,
      description: "Need resolution",
      icon: FileText,
      href: "/home/admin/disputes",
      color: "text-orange-600",
    },
    {
      title: "Total Revenue",
      value: `₹${((totalRevenue[0]?.total || 0) / 100).toLocaleString()}`,
      description: "All time",
      icon: DollarSign,
      href: "/home/admin/transactions",
      color: "text-green-600",
    },
    {
      title: "Recent Transactions",
      value: recentTransactionsCount[0]?.count || 0,
      description: "Last 7 days",
      icon: DollarSign,
      href: "/home/admin/transactions",
      color: "text-purple-600",
    },
  ]

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage creators, content, reports, and disputes
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Link key={stat.title} href={stat.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common admin tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/home/admin/creators?status=pending">
              <Button variant="outline" className="w-full justify-start">
                <Users className="mr-2 h-4 w-4" />
                Review Pending Creators
              </Button>
            </Link>
            <Link href="/home/admin/reports">
              <Button variant="outline" className="w-full justify-start">
                <AlertTriangle className="mr-2 h-4 w-4" />
                Review Reports
              </Button>
            </Link>
            <Link href="/home/admin/content">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="mr-2 h-4 w-4" />
                Moderate Content
              </Button>
            </Link>
            <Link href="/home/admin/disputes">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="mr-2 h-4 w-4" />
                Resolve Disputes
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

