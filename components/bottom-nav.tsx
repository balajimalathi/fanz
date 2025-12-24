"use client"

import * as React from "react"
import { type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useIsMobileOrTablet } from "@/hooks/use-mobile-tablet"
import { iconMap } from "@/lib/sidebar-data"

export function BottomNav({
  items,
}: {
  items: {
    title: string
    url: string
    icon: string
    isActive?: boolean
    badge?: string
  }[] | undefined
}) {
  const isMobileOrTablet = useIsMobileOrTablet()

  if (!isMobileOrTablet || !items || items.length === 0) {
    return null
  }

  console.log(items)

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 lg:hidden">
      <div className="flex h-16 items-center justify-around">
        {items.map((item) => {
          const Icon = iconMap[item.icon] as LucideIcon | undefined
          if (!Icon) return null

          return (
            <a
              key={item.title}
              href={item.url}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 text-xs transition-colors",
                item.isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {item.badge && (
                  <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{item.title}</span>
            </a>
          )
        })}
      </div>
    </nav>
  )
}

