"use client"

import React from "react"
import { usePathname } from "next/navigation"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

function capitalize(s: string) {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ')
}

export function DynamicBreadcrumb() {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)

  // Remove 'app' from segments if it exists as the first segment, 
  // since we treat /app as the "Home" or root of this view.
  const displaySegments = segments.map((s, i) => (s === 'app' && i === 0) ? null : s).filter(Boolean) as string[]

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {/* <BreadcrumbItem>
          <BreadcrumbLink href="/home">Home</BreadcrumbLink>
        </BreadcrumbItem> */}
        {displaySegments.length > 0 && <BreadcrumbSeparator />}

        {displaySegments.map((segment, index) => {
          const isLast = index === displaySegments.length - 1

          // Reconstruct path: /home + /segment1 + /segment2 ...
          // Does the original path include 'home'?
          // If we filtered 'home' out, we need to be careful with href construction so it matches actual routes.
          // Assuming routes are /home/foo/bar.
          const href = `/${displaySegments.slice(0, index + 1).join("/")}`

          const title = capitalize(decodeURIComponent(segment))

          return (
            <React.Fragment key={href}>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="line-clamp-1">{title}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={href}>{title}</BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </React.Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
