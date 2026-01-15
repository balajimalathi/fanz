"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Video, ShoppingBag, Users, Link as LinkIcon } from "lucide-react";
import Link from "next/link";

interface QuickAction {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  variant?: "default" | "outline" | "secondary";
}

const quickActions: QuickAction[] = [
  {
    title: "Create Post",
    description: "Share new content with your audience",
    icon: Plus,
    href: "/home/create",
    variant: "outline",
  },
  {
    title: "Start Live Stream",
    description: "Go live and connect with fans",
    icon: Video,
    href: "/home/live",
    variant: "outline",
  },
  {
    title: "Create Service",
    description: "Offer shoutouts, calls, and more",
    icon: ShoppingBag,
    href: "/home/my-app", // Update when service creation page exists
    variant: "outline",
  },
  {
    title: "Create Membership",
    description: "Set up subscription tiers",
    icon: Users,
    href: "/home/my-app", // Update when membership creation page exists
    variant: "outline",
  },
];

export function QuickActions() {
  return (
    <div className="grid gap-3 md:grid-cols-4">
      {quickActions.map((action) => {
        const Icon = action.icon;
        return (
          <Link key={action.title} href={action.href}>
            <Button
              variant={action.variant || "outline"}
              className="w-full justify-start h-auto py-4 px-4"
            >
              <Icon className="h-5 w-5 mr-3" />
              <div className="flex flex-col items-start text-left">
                <span className="font-medium">{action.title}</span>
                <span className="text-xs text-muted-foreground font-normal">
                  {action.description}
                </span>
              </div>
            </Button>
          </Link>
        );
      })}
    </div>
  );
}

