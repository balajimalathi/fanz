"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSign,
  Users,
  UserPlus,
  CreditCard,
  MessageSquare,
  ShoppingBag,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { formatCurrency, formatCurrencyCompact } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";
import { useCreatorCurrency } from "@/lib/hooks/use-creator-currency";

interface StatCardProps {
  title: string;
  value: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

function StatCard({ title, value, description, icon: Icon, trend }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend && (
          <div className="flex items-center mt-2 text-xs">
            {trend.isPositive ? (
              <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
            )}
            <span
              className={cn(
                trend.isPositive ? "text-green-600" : "text-red-600"
              )}
            >
              {Math.abs(trend.value)}%
            </span>
            <span className="text-muted-foreground ml-1">vs last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface StatsOverviewProps {
  totalRevenue: number; // in paise
  thisMonthRevenue: number; // in paise
  totalSubscribers: number;
  totalFollowers: number;
  pendingPayoutAmount: number; // in paise
  unreadMessages: number;
  pendingServiceOrders: number;
}

export function StatsOverview({
  totalRevenue,
  thisMonthRevenue,
  totalSubscribers,
  totalFollowers,
  pendingPayoutAmount,
  unreadMessages,
  pendingServiceOrders,
}: StatsOverviewProps) {
  const { currency: creatorCurrency, loading } = useCreatorCurrency();
  
  // Calculate trend (simplified - comparing this month to last month)
  // In a real implementation, you'd fetch last month's revenue
  const revenueTrend = thisMonthRevenue > 0 ? { value: 0, isPositive: true } : undefined;

  // Use creator currency for all revenue displays
  const currency = loading ? "USD" : creatorCurrency;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <StatCard
        title="Total Revenue"
        value={formatCurrencyCompact(totalRevenue, currency)}
        description="All-time earnings"
        icon={DollarSign}
        trend={revenueTrend}
      />
      <StatCard
        title="Total Subscribers"
        value={totalSubscribers.toString()}
        description="Active subscriptions"
        icon={Users}
      />
      <StatCard
        title="Total Followers"
        value={totalFollowers.toString()}
        description="People following you"
        icon={UserPlus}
      />
      <StatCard
        title="Pending Payouts"
        value={formatCurrencyCompact(pendingPayoutAmount, currency)}
        description="Awaiting processing"
        icon={CreditCard}
      />
      <StatCard
        title="Unread Messages"
        value={unreadMessages.toString()}
        description="New conversations"
        icon={MessageSquare}
      />
      <StatCard
        title="Pending Orders"
        value={pendingServiceOrders.toString()}
        description="Service orders to fulfill"
        icon={ShoppingBag}
      />
    </div>
  );
}

