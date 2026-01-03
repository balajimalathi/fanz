import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { creator, user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { StatsOverview } from "@/components/dashboard/stats-overview";
import { RevenueSection } from "@/components/dashboard/revenue-section";
import { SubscribersSection } from "@/components/dashboard/subscribers-section";
import { EngagementSection } from "@/components/dashboard/engagement-section";
import { QuickActions } from "@/components/dashboard/quick-actions";
import {
  getRevenueMetrics,
  getRecentTransactions,
  getRevenueChartData,
} from "@/lib/dashboard/revenue-data";
import {
  getSubscriberMetrics,
  getSubscriberGrowthChartData,
} from "@/lib/dashboard/subscriber-data";
import {
  getEngagementMetrics,
  getRecentActivity,
} from "@/lib/dashboard/engagement-data";
import { Separator } from "@/components/ui/separator";

export default async function HomePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  // Check if user has creator role, if not set it
  if (session.user.role !== "creator") {
    // Update user role to creator
    await db
      .update(user)
      .set({ role: "creator" })
      .where(eq(user.id, session.user.id));
  }

  // Get creator record
  const creatorRecord = await db.query.creator.findFirst({
    where: (c, { eq: eqOp }) => eqOp(c.id, session.user.id),
  });

  // If creator record doesn't exist, create it
  if (!creatorRecord) {
    await db.insert(creator).values({
      id: session.user.id,
      displayName: session.user.name || "",
      onboardingStep: 0,
      onboardingData: {},
    });
    // Redirect to onboarding
    redirect("/onboarding");
  }

  // If not onboarded, redirect to onboarding
  if (!creatorRecord.onboarded) {
    redirect("/onboarding");
  }

  const creatorId = session.user.id;

  // Fetch all dashboard data in parallel
  const [
    revenueMetrics,
    recentTransactions,
    revenueChartData,
    subscriberMetrics,
    subscriberChartData,
    engagementMetrics,
    recentActivity,
  ] = await Promise.all([
    getRevenueMetrics(creatorId),
    getRecentTransactions(creatorId, 10),
    getRevenueChartData(creatorId),
    getSubscriberMetrics(creatorId),
    getSubscriberGrowthChartData(creatorId),
    getEngagementMetrics(creatorId),
    getRecentActivity(creatorId, 20),
  ]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's an overview of your creator account.
        </p>
      </div>
      
      {/* Quick Actions */}
      <QuickActions />

      {/* Stats Overview */}
      <StatsOverview
        totalRevenue={revenueMetrics.totalRevenue}
        thisMonthRevenue={revenueMetrics.thisMonthRevenue}
        totalSubscribers={subscriberMetrics.totalSubscribers}
        totalFollowers={subscriberMetrics.totalFollowers}
        pendingPayoutAmount={revenueMetrics.pendingPayoutAmount}
        unreadMessages={engagementMetrics.unreadMessages}
        pendingServiceOrders={engagementMetrics.pendingServiceOrders}
      />

      {/* Revenue Section */}
      <RevenueSection
        revenueMetrics={revenueMetrics}
        recentTransactions={recentTransactions}
        chartData={revenueChartData}
      />

      {/* Subscribers Section */}
      <SubscribersSection
        subscriberMetrics={subscriberMetrics}
        chartData={subscriberChartData}
      />

      {/* Engagement Section */}
      <EngagementSection
        engagementMetrics={engagementMetrics}
        recentActivity={recentActivity}
      />
    </div>
  );
}
