"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { SubscriberMetrics } from "@/lib/dashboard/subscriber-data";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils/currency";
import { TrendingUp } from "lucide-react";

interface SubscribersSectionProps {
  subscriberMetrics: SubscriberMetrics;
  chartData: { date: string; subscribers: number }[];
}

export function SubscribersSection({
  subscriberMetrics,
  chartData,
}: SubscribersSectionProps) {
  const chartConfig = {
    subscribers: {
      label: "Subscribers",
      color: "hsl(var(--chart-2))",
    },
  };

  // Format chart data for display
  const formattedChartData = chartData.map((item) => ({
    date: format(new Date(item.date), "MMM dd"),
    subscribers: item.subscribers,
  }));

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Subscriber Metrics</CardTitle>
          <CardDescription>Your audience growth</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Subscribers</span>
              <span className="text-lg font-semibold">
                {subscriberMetrics.totalSubscribers}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Followers</span>
              <span className="text-base font-medium">
                {subscriberMetrics.totalFollowers}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">New This Month</span>
              <div className="flex items-center gap-2">
                <span className="text-base font-medium">
                  {subscriberMetrics.newSubscribersThisMonth}
                </span>
                {subscriberMetrics.newSubscribersThisMonth > 0 && (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subscriber Growth</CardTitle>
          <CardDescription>Last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig}>
            <LineChart data={formattedChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="subscribers"
                stroke="var(--color-subscribers)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Membership Breakdown</CardTitle>
          <CardDescription>Subscribers by membership tier</CardDescription>
        </CardHeader>
        <CardContent>
          {subscriberMetrics.membershipBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No memberships created yet
            </p>
          ) : (
            <div className="space-y-4">
              {subscriberMetrics.membershipBreakdown.map((membership) => (
                <div
                  key={membership.membershipId}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{membership.membershipTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(membership.monthlyFee)}/month
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">
                      {membership.subscriberCount}
                    </p>
                    <p className="text-xs text-muted-foreground">subscribers</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

