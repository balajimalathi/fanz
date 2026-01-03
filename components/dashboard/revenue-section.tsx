"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { formatCurrency } from "@/lib/utils/currency";
import { RevenueMetrics, RecentTransaction } from "@/lib/dashboard/revenue-data";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { format } from "date-fns";
import { useCreatorCurrency } from "@/lib/hooks/use-creator-currency";
import { getCurrencySymbol } from "@/lib/currency/currency-utils";

interface RevenueSectionProps {
  revenueMetrics: RevenueMetrics;
  recentTransactions: RecentTransaction[];
  chartData: { date: string; revenue: number }[];
}

export function RevenueSection({
  revenueMetrics,
  recentTransactions,
  chartData,
}: RevenueSectionProps) {
  const { currency: creatorCurrency, loading } = useCreatorCurrency();
  const currency = loading ? "USD" : creatorCurrency;
  const currencySymbol = getCurrencySymbol(currency);

  const chartConfig = {
    revenue: {
      label: "Revenue",
      color: "hsl(var(--chart-1))",
    },
  };

  // Format chart data for display - amounts are in subunits, need to convert based on currency decimals
  const { getCurrencyDecimals } = require("@/lib/currency/currency-utils");
  const decimals = getCurrencyDecimals(currency);
  const divisor = Math.pow(10, decimals);
  
  const formattedChartData = chartData.map((item) => ({
    date: format(new Date(item.date), "MMM dd"),
    revenue: item.revenue / divisor, // Convert subunits to display format
  }));

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Revenue Overview</CardTitle>
          <CardDescription>Your earnings breakdown</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Revenue</span>
              <span className="text-lg font-semibold">
                {formatCurrency(revenueMetrics.totalRevenue, currency)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">This Month</span>
              <span className="text-base font-medium">
                {formatCurrency(revenueMetrics.thisMonthRevenue, currency)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">This Week</span>
              <span className="text-base font-medium">
                {formatCurrency(revenueMetrics.thisWeekRevenue, currency)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-sm font-medium">Pending Payout</span>
              <span className="text-lg font-semibold text-orange-600">
                {formatCurrency(revenueMetrics.pendingPayoutAmount, currency)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
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
                tickFormatter={(value) => `${currencySymbol}${value}`}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="var(--color-revenue)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Your latest payment transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {recentTransactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No transactions yet
            </p>
          ) : (
            <div className="space-y-4">
              {recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium capitalize">
                      {transaction.type.replace("_", " ")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(transaction.createdAt), "MMM dd, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      {transaction.formattedAmount}
                    </p>
                    <p
                      className={`text-xs ${
                        transaction.status === "completed"
                          ? "text-green-600"
                          : transaction.status === "pending"
                          ? "text-orange-600"
                          : "text-muted-foreground"
                      }`}
                    >
                      {transaction.status}
                    </p>
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

