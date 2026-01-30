"use client"

import { useEffect } from "react"
import toast from "react-hot-toast"
import { initializeFirebase, onForegroundMessage } from "@/lib/push/client"

export function PushInit() {
  useEffect(() => {
    if (typeof window === "undefined") return

    initializeFirebase()

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => {})
        .catch((error) => {
          console.error("Service Worker registration failed:", error)
        })
    }

    const unsubscribe = onForegroundMessage((payload) => {
      console.log("Foreground message received:", payload)
      const title =
        payload?.notification?.title ??
        payload?.data?.title ??
        "New notification"
      const body =
        payload?.notification?.body ??
        payload?.data?.body ??
        ""
      const messageText = body ? `${title}: ${body}` : title
      try {
        toast.success(messageText, { duration: 5000 })
      } catch (e) {
        console.warn("Toast failed:", e)
      }
      if (
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        try {
          new Notification(title, {
            body,
            icon:
              payload?.notification?.icon ??
              payload?.data?.icon ??
              "/logo.svg",
          })
        } catch (err) {
          console.warn("Browser notification failed:", err)
        }
      }
    })

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [])

  return null
}

