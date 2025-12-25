"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Bell, BellOff, X } from "lucide-react"
import {
  subscribeToPushNotifications,
  getNotificationPermission,
  isNotificationSupported,
} from "@/lib/push/client"
import { toast } from "sonner"

interface NotificationPermissionProps {
  className?: string
}

export function NotificationPermission({ className }: NotificationPermissionProps) {
  const [permission, setPermission] = useState<NotificationPermission>("default")
  const [isLoading, setIsLoading] = useState(false)
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return

    setIsSupported(isNotificationSupported())
    setPermission(getNotificationPermission())

    // Listen for permission changes
    if ("Notification" in window) {
      const checkPermission = () => {
        setPermission(Notification.permission)
      }

      // Check permission periodically (in case user changes it in browser settings)
      const interval = setInterval(checkPermission, 5000)

      return () => clearInterval(interval)
    }
  }, [])

  const handleEnableNotifications = async () => {
    if (!isSupported) {
      toast.error("Notifications are not supported in this browser")
      return
    }

    setIsLoading(true)
    try {
      // Check current permission before requesting
      const currentPermission = getNotificationPermission()
      if (currentPermission === "denied") {
        toast.error("Notifications are blocked. Please enable them in your browser settings.")
        setIsLoading(false)
        return
      }

      console.log("Requesting notification permission...")
      const token = await subscribeToPushNotifications()

      // Update permission state immediately after the browser prompt
      const newPermission = getNotificationPermission()
      setPermission(newPermission)

      if (!token) {
        if (newPermission === "denied") {
          toast.error("Notification permission was denied. Please enable it in your browser settings.")
        } else if (newPermission === "default") {
          toast.error("Notification permission was dismissed. Please try again and click 'Allow'.")
        } else {
          toast.error("Failed to get notification token. Please check your browser console for details.")
        }
        setIsLoading(false)
        return
      }

      console.log("FCM token received, sending to server...")
      // Send token to server
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          userAgent: navigator.userAgent,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log("Subscription registered successfully:", data)
        toast.success("Notifications enabled! You'll receive updates from creators you follow.")
        setPermission("granted")
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error("Failed to register subscription:", errorData)
        throw new Error(errorData.error || "Failed to register subscription")
      }
    } catch (error: any) {
      console.error("Error enabling notifications:", error)
      const errorMessage = error?.message || "Failed to enable notifications"
      
      // Provide more specific error messages
      if (errorMessage.includes("permission")) {
        toast.error("Please allow notifications in your browser settings and try again.")
      } else if (errorMessage.includes("service worker")) {
        toast.error("Service worker error. Please refresh the page and try again.")
      } else if (errorMessage.includes("Firebase") || errorMessage.includes("FCM")) {
        toast.error("Firebase configuration error. Please contact support.")
      } else {
        toast.error(errorMessage)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisableNotifications = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/push/preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          enabled: false,
        }),
      })

      if (response.ok) {
        toast.success("Notifications disabled")
        // Note: We don't change the permission state here because the browser permission
        // is still granted, we just disabled the app-level preference
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error("Failed to disable notifications:", errorData)
        throw new Error(errorData.error || "Failed to update preferences")
      }
    } catch (error: any) {
      console.error("Error disabling notifications:", error)
      toast.error(error?.message || "Failed to disable notifications")
    } finally {
      setIsLoading(false)
    }
  }

  if (!isSupported) {
    return null
  }

  if (permission === "granted") {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleDisableNotifications}
        disabled={isLoading}
        className={className}
      >
        <BellOff className="mr-2 h-4 w-4" />
        Disable Notifications
      </Button>
    )
  }

  if (permission === "denied") {
    return (
      <div className={className}>
        <p className="text-sm text-muted-foreground">
          Notifications are blocked. Please enable them in your browser settings.
        </p>
      </div>
    )
  }

  return (
    <Button
      variant="default"
      size="sm"
      onClick={handleEnableNotifications}
      disabled={isLoading}
      className={className}
    >
      <Bell className="mr-2 h-4 w-4" />
      {isLoading ? "Enabling..." : "Enable Notifications"}
    </Button>
  )
}

