"use client"

import * as React from "react"

import { NavSecondary } from "@/components/nav-secondary"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { NavUser } from "./nav-user"
import { useSession } from "@/lib/auth/auth-client"
import { useIsMobileOrTablet } from "@/hooks/use-mobile-tablet"
import { sidebarData } from "@/lib/sidebar-data"
import { Shield, Users, FileText, AlertTriangle, DollarSign } from "lucide-react"

export function AdminSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = useSession()
  const isMobileOrTablet = useIsMobileOrTablet()

  // Get user data from session, with fallback values
  const user = session?.user
    ? {
        name: session.user.name || "Admin",
        email: session.user.email || "",
        avatar: session.user.image || "",
      }
    : {
        name: "Guest",
        email: "",
        avatar: "",
      }

  const adminNavItems = [
    {
      title: "Admin Dashboard",
      url: "/admin",
      icon: Shield,
    },
    {
      title: "Creators",
      url: "/admin/creators",
      icon: Users,
    },
    {
      title: "Content",
      url: "/admin/content",
      icon: FileText,
    },
    {
      title: "Reports",
      url: "/admin/reports",
      icon: AlertTriangle,
    },
    {
      title: "Disputes",
      url: "/admin/disputes",
      icon: FileText,
    },
    {
      title: "Transactions",
      url: "/admin/transactions",
      icon: DollarSign,
    },
  ]

  return (
    <Sidebar className="border-r-0" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={sidebarData.teams} />
      </SidebarHeader>
      <SidebarContent> 
        <NavSecondary items={adminNavItems} />
      </SidebarContent>
      <SidebarRail />
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
