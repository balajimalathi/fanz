"use client"

import { useEffect, useRef } from "react"
import { useSession } from "@/lib/auth/auth-client"

/**
 * Component that sends heartbeat to keep creator online status updated
 * Should be included in creator-facing pages
 */
export function CreatorOnlineHeartbeat() {
  const { data: session } = useSession()
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Only run for creators
    // Note: role exists in the database but may not be in the TypeScript type
    const userRole = (session?.user as { role?: string })?.role
    if (!session?.user || userRole !== "creator") {
      return
    }

    const sendHeartbeat = async () => {
      try {
        await fetch("/api/creator/online-status", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ isOnline: true }),
        })
      } catch (error) {
        console.error("Error sending creator heartbeat:", error)
      }
    }

    // Send initial heartbeat
    sendHeartbeat()

    // Send heartbeat every 45 seconds (before 2 minute timeout)
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, 45000)

    // Send offline status when component unmounts or page unloads
    const handleBeforeUnload = () => {
      fetch("/api/creator/online-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isOnline: false }),
      }).catch(() => {
        // Ignore errors on unload
      })
    }

    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
      }
      window.removeEventListener("beforeunload", handleBeforeUnload)
      
      // Send offline status on cleanup
      fetch("/api/creator/online-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isOnline: false }),
      }).catch(() => {
        // Ignore errors on cleanup
      })
    }
  }, [session?.user])

  return null // This component doesn't render anything
}
