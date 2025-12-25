"use client"

import { useEffect } from "react"
import { initializeFirebase, onForegroundMessage } from "@/lib/push/client"

export function PushInit() {
  useEffect(() => {
    if (typeof window === "undefined") return

    // Initialize Firebase
    initializeFirebase()

    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("Service Worker registered:", registration)
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error)
        })
    }

    // Listen for foreground messages
    const unsubscribe = onForegroundMessage((payload) => {
      console.log("Foreground message received:", payload)
      // You can show a custom notification or update UI here
      if (payload.notification) {
        new Notification(payload.notification.title || "New Notification", {
          body: payload.notification.body,
          icon: payload.notification.icon || "/logo.svg",
          image: payload.notification.image,
        })
      }
    })

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [])

  return null
}

