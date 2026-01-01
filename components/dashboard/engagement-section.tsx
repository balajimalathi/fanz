"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EngagementMetrics, RecentActivity } from "@/lib/dashboard/engagement-data";
import {
  MessageSquare,
  ShoppingBag,
  Phone,
  Heart,
  MessageCircle,
  UserPlus,
  CreditCard,
} from "lucide-react";
import { format } from "date-fns";
import { formatDistanceToNow } from "date-fns";

interface EngagementSectionProps {
  engagementMetrics: EngagementMetrics;
  recentActivity: RecentActivity[];
}

const activityIcons = {
  follower: UserPlus,
  subscriber: CreditCard,
  like: Heart,
  comment: MessageCircle,
  service_order: ShoppingBag,
  call: Phone,
};

export function EngagementSection({
  engagementMetrics,
  recentActivity,
}: EngagementSectionProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Engagement Metrics</CardTitle>
          <CardDescription>Your audience interactions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Active Conversations</span>
              </div>
              <span className="text-lg font-semibold">
                {engagementMetrics.activeConversations}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Unread Messages</span>
              </div>
              <span className="text-base font-medium">
                {engagementMetrics.unreadMessages}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Pending Orders</span>
              </div>
              <span className="text-base font-medium">
                {engagementMetrics.pendingServiceOrders}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Recent Calls</span>
              </div>
              <span className="text-base font-medium">
                {engagementMetrics.recentCalls}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest interactions and updates</CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No recent activity
            </p>
          ) : (
            <div className="space-y-3">
              {recentActivity.slice(0, 10).map((activity) => {
                const Icon = activityIcons[activity.type] || MessageSquare;
                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 rounded-lg border"
                  >
                    <div className="mt-0.5">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">{activity.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

