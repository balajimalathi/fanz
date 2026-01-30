"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Loader2, 
  Bell, 
  Check, 
  ShoppingBag, 
  CreditCard, 
  UserPlus, 
  Video, 
  FileText, 
  CheckCircle2, 
  PlayCircle,
  MessageSquare,
  Heart,
  Megaphone,
  AlertCircle,
  type LucideIcon
} from "lucide-react"
import { formatRelativeTime } from "@/lib/utils/date-formatting"

// Notification type configuration with icons and colors
const notificationTypeConfig: Record<string, { icon: LucideIcon; bgColor: string; iconColor: string }> = {
  // Service & Order related
  service_order: { icon: ShoppingBag, bgColor: "bg-blue-100 dark:bg-blue-950", iconColor: "text-blue-600 dark:text-blue-400" },
  service_order_activated: { icon: PlayCircle, bgColor: "bg-purple-100 dark:bg-purple-950", iconColor: "text-purple-600 dark:text-purple-400" },
  service_order_fulfilled: { icon: CheckCircle2, bgColor: "bg-green-100 dark:bg-green-950", iconColor: "text-green-600 dark:text-green-400" },
  
  // Payment related
  membership_subscription: { icon: UserPlus, bgColor: "bg-emerald-100 dark:bg-emerald-950", iconColor: "text-emerald-600 dark:text-emerald-400" },
  post_purchase: { icon: CreditCard, bgColor: "bg-amber-100 dark:bg-amber-950", iconColor: "text-amber-600 dark:text-amber-400" },
  live_stream_purchase: { icon: Video, bgColor: "bg-pink-100 dark:bg-pink-950", iconColor: "text-pink-600 dark:text-pink-400" },
  
  // Content related
  new_post: { icon: FileText, bgColor: "bg-indigo-100 dark:bg-indigo-950", iconColor: "text-indigo-600 dark:text-indigo-400" },
  broadcast: { icon: Megaphone, bgColor: "bg-orange-100 dark:bg-orange-950", iconColor: "text-orange-600 dark:text-orange-400" },
  
  // Social interactions
  new_follower: { icon: UserPlus, bgColor: "bg-cyan-100 dark:bg-cyan-950", iconColor: "text-cyan-600 dark:text-cyan-400" },
  new_message: { icon: MessageSquare, bgColor: "bg-violet-100 dark:bg-violet-950", iconColor: "text-violet-600 dark:text-violet-400" },
  comment: { icon: MessageSquare, bgColor: "bg-sky-100 dark:bg-sky-950", iconColor: "text-sky-600 dark:text-sky-400" },
  like: { icon: Heart, bgColor: "bg-rose-100 dark:bg-rose-950", iconColor: "text-rose-600 dark:text-rose-400" },
  
  // System/Alert
  system: { icon: AlertCircle, bgColor: "bg-gray-100 dark:bg-gray-800", iconColor: "text-gray-600 dark:text-gray-400" },
}

const getNotificationConfig = (type: string) => {
  return notificationTypeConfig[type] || { icon: Bell, bgColor: "bg-gray-100 dark:bg-gray-800", iconColor: "text-gray-600 dark:text-gray-400" }
}

function NotificationCard({ 
  notification, 
  onMarkAsRead 
}: { 
  notification: Notification
  onMarkAsRead: (id: string) => void 
}) {
  const config = getNotificationConfig(notification.type)
  const NotificationIcon = config.icon

  return (
    <Card className={!notification.read ? "border-primary" : ""}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`shrink-0 p-2 rounded-full ${config.bgColor}`}>
            <NotificationIcon className={`h-4 w-4 ${config.iconColor}`} />
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold">{notification.title}</h3>
              {!notification.read && (
                <Badge variant="default" className="h-2 w-2 p-0 rounded-full" />
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              {notification.message}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatRelativeTime(notification.createdAt)}
            </p>
            {notification.link && (
              <Link
                href={notification.link}
                className="text-sm text-primary hover:underline mt-2 inline-block"
                onClick={() => onMarkAsRead(notification.id)}
              >
                View →
              </Link>
            )}
          </div>
          
          {/* Mark as read button */}
          {!notification.read && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onMarkAsRead(notification.id)}
              className="shrink-0"
            >
              <Check className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface Notification {
  id: string
  type: string
  title: string
  message: string
  link: string | null
  read: boolean
  createdAt: string
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/notifications?limit=50")
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (error) {
      console.error("Error fetching notifications:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "PATCH",
      })

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, read: true } : n
          )
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter((n) => !n.read)
      await Promise.all(
        unreadNotifications.map((n) =>
          fetch(`/api/notifications/${n.id}/read`, { method: "PATCH" })
        )
      )
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error("Error marking all as read:", error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="container max-w-4xl mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground mt-1">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
              : "All caught up!"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/home/notifications/send">
              <Bell className="mr-2 h-4 w-4" />
              Send Notification
            </Link>
          </Button>
          {unreadCount > 0 && (
            <Button variant="outline" onClick={markAllAsRead}>
              Mark all as read
            </Button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No notifications yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <NotificationCard 
              key={notification.id} 
              notification={notification} 
              onMarkAsRead={markAsRead} 
            />
          ))}
        </div>
      )}
    </div>
  )
}

