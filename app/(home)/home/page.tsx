import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/client"
import {
  creator,
  user,
  paymentTransaction,
  follower,
  post,
  service,
  membership,
} from "@/lib/db/schema"
import { eq, sql, desc, and, gte } from "drizzle-orm"
import { OnboardingChecklist } from "./_components/onboarding-checklist"
import { StatsCards } from "./_components/stats-cards"
import { RevenueChart } from "./_components/revenue-chart"
import { RecentSales } from "./_components/recent-sales"

async function getDashboardStats(creatorId: string) {
  // 1. Total Revenue
  const revenueResult = await db
    .select({
      total: sql<number>`sum(${paymentTransaction.creatorAmount})`,
    })
    .from(paymentTransaction)
    .where(
      and(
        eq(paymentTransaction.creatorId, creatorId),
        eq(paymentTransaction.status, "completed")
      )
    )

  const totalRevenue = revenueResult[0]?.total || 0

  // 2. Total Followers
  const followersResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(follower)
    .where(eq(follower.creatorId, creatorId))

  const totalFollowers = followersResult[0]?.count || 0

  // 3. Total Sales (Posts + Services)
  const salesResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(paymentTransaction)
    .where(
      and(
        eq(paymentTransaction.creatorId, creatorId),
        eq(paymentTransaction.status, "completed")
      )
    )

  const totalSales = salesResult[0]?.count || 0

  // 4. Recent Transactions
  // Note: Using leftJoin because relations might not be fully defined in schema for query builder
  const recentTransactionsResult = await db
    .select({
      transaction: paymentTransaction,
      user: user,
    })
    .from(paymentTransaction)
    .leftJoin(user, eq(paymentTransaction.userId, user.id))
    .where(
      and(
        eq(paymentTransaction.creatorId, creatorId),
        eq(paymentTransaction.status, "completed")
      )
    )
    .orderBy(desc(paymentTransaction.createdAt))
    .limit(5)

  const recentTransactions = recentTransactionsResult.map(({ transaction, user }) => ({
    ...transaction,
    user: user,
  }))

  // 5. Monthly Revenue Data (Last 30 days) - for the chart
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const revenueOverTime = await db
    .select({
      date: sql<string>`DATE(${paymentTransaction.createdAt})`,
      amount: sql<number>`sum(${paymentTransaction.creatorAmount})`,
    })
    .from(paymentTransaction)
    .where(
      and(
        eq(paymentTransaction.creatorId, creatorId),
        eq(paymentTransaction.status, "completed"),
        gte(paymentTransaction.createdAt, thirtyDaysAgo)
      )
    )
    .groupBy(sql`DATE(${paymentTransaction.createdAt})`)
    .orderBy(sql`DATE(${paymentTransaction.createdAt})`)

  return {
    totalRevenue,
    totalFollowers,
    totalSales,
    recentTransactions,
    revenueOverTime,
  }
}

async function getOnboardingStatus(creatorId: string) {
  const creatorRecord = await db.query.creator.findFirst({
    where: (c, { eq }) => eq(c.id, creatorId),
  })

  if (!creatorRecord) return null

  const postCountResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(post)
    .where(eq(post.creatorId, creatorId))
  const postCount = postCountResult[0]?.count || 0

  const serviceCountResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(service)
    .where(eq(service.creatorId, creatorId))
  const serviceCount = serviceCountResult[0]?.count || 0

  const membershipCountResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(membership)
    .where(eq(membership.creatorId, creatorId))
  const membershipCount = membershipCountResult[0]?.count || 0

  const checks = [
    {
      id: "bio",
      label: "Add a bio to your profile",
      completed: !!creatorRecord.bio && creatorRecord.bio.length > 0,
      link: "/settings/profile",
    },
    {
      id: "profile_image",
      label: "Upload a profile picture",
      completed: !!creatorRecord.profileImageUrl,
      link: "/settings/profile",
    },
    {
      id: "display_name",
      label: "Set your display name",
      completed: !!creatorRecord.displayName,
      link: "/settings/profile",
    },
    {
      id: "content",
      label: "Create your first post",
      completed: postCount > 0,
      link: "/posts/new",
    },
    {
      id: "monetization",
      label: "Create a Service or Membership",
      completed: serviceCount > 0 || membershipCount > 0,
      link: "/monetization",
    },
  ]

  const completedCount = checks.filter((c) => c.completed).length
  const totalCount = checks.length
  const isComplete = completedCount === totalCount

  return {
    checks,
    completedCount,
    totalCount,
    isComplete,
  }
}

export default async function HomePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect("/login")
  }

  // Ensure user is a creator
  if (session.user.role !== "creator") {
    await db
      .update(user)
      .set({ role: "creator" })
      .where(eq(user.id, session.user.id))
  }

  // Get or Create Creator Record
  let creatorRecord = await db.query.creator.findFirst({
    where: (c, { eq }) => eq(c.id, session.user.id),
  })

  if (!creatorRecord) {
    await db.insert(creator).values({
      id: session.user.id,
      displayName: session.user.name || "Creator",
      onboardingStep: 0,
      onboardingData: {},
    })
    // Re-fetch to be safe
    creatorRecord = await db.query.creator.findFirst({
      where: (c, { eq }) => eq(c.id, session.user.id),
    })
    redirect("/onboarding")
  }

  if (!creatorRecord?.onboarded) {
    redirect("/onboarding")
  }

  const [stats, onboardingStatus] = await Promise.all([
    getDashboardStats(creatorRecord.id),
    getOnboardingStatus(creatorRecord.id),
  ])

  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center space-x-2">
          {/* Date Range Picker Placeholder or similar controls could go here */}
          <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2">
            Download Report
          </button>
        </div>
      </div>

      <OnboardingChecklist status={onboardingStatus} />

      <StatsCards stats={stats} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <RevenueChart data={stats.revenueOverTime} />
        <RecentSales transactions={stats.recentTransactions} totalSales={stats.totalSales} />
      </div>
    </div>
  )
}
