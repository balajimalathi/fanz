"use client"

import { useEffect, useRef } from "react"
import { useSession } from "@/lib/auth/auth-client"

/**
 * Component that maintains creator online status via SSE stream
 * Connection open = online, connection closed = offline
 * Should be included in creator-facing pages
 */
export function CreatorOnlineHeartbeat() {
  const { data: session } = useSession()
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    // Only run for creators
    // Note: role exists in the database but may not be in the TypeScript type
    const userRole = (session?.user as { role?: string })?.role
    if (!session?.user || userRole !== "creator") {
      return
    }

    // Connect to SSE stream - connection open = online, closed = offline
    const eventSource = new EventSource("/api/creator/online-status/stream")
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      console.log("Creator online status stream connected")
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === "connected") {
          console.log("Creator marked as online")
        } else if (data.type === "heartbeat") {
          // Heartbeat received, connection is alive
        }
      } catch (error) {
        console.error("Error parsing SSE message:", error)
      }
    }

    eventSource.onerror = (error) => {
      console.error("SSE stream error:", error)
      // EventSource will automatically reconnect
    }

    // Cleanup: Close connection when component unmounts or page unloads
    const handleBeforeUnload = () => {
      eventSource.close()
    }

    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
  }, [session?.user])

  return null // This component doesn't render anything
}
