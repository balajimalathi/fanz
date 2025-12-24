"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
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

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = useSession()
  const isMobileOrTablet = useIsMobileOrTablet()

  // Get user data from session, with fallback values
  const user = session?.user
    ? {
        name: session.user.name || "User",
        email: session.user.email || "",
        avatar: session.user.image || "",
      }
    : {
        name: "Guest",
        email: "",
        avatar: "",
      }

  return (
    <Sidebar className="border-r-0" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={sidebarData.teams} />
        {!isMobileOrTablet && <NavMain items={sidebarData.navMain} />}
      </SidebarHeader>
      <SidebarContent> 
        <NavSecondary items={sidebarData.navSecondary} className="md:mt-auto" />
      </SidebarContent>
      <SidebarRail />
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
