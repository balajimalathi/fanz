"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, Bell, Check, ArrowLeft } from "lucide-react"
import { formatRelativeTime } from "@/lib/utils/date-formatting"
import {
  getNotificationConfig,
  type NotificationItem,
} from "@/lib/notifications/config"

const PAGE_SIZE = 20

interface FanNotificationsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function NotificationCardRow({
  notification,
  onMarkAsRead,
}: {
  notification: NotificationItem
  onMarkAsRead: (id: string) => void
}) {
  const config = getNotificationConfig(notification.type)
  const Icon = config.icon

  return (
    <Card className={!notification.read ? "border-primary" : ""}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div
            className={`shrink-0 p-2 rounded-full ${config.bgColor}`}
          >
            <Icon className={`h-4 w-4 ${config.iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm">{notification.title}</h3>
              {!notification.read && (
                <Badge variant="default" className="h-2 w-2 p-0 rounded-full" />
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
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

export function FanNotificationsModal({
  open,
  onOpenChange,
}: FanNotificationsModalProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [loadMoreLoading, setLoadMoreLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)

  const closeInitiatedByButton = useRef(false)

  const fetchNotifications = async (offset: number, append: boolean) => {
    const setLoading = append ? setLoadMoreLoading : setIsLoading
    try {
      setLoading(true)
      const response = await fetch(
        `/api/notifications?limit=${PAGE_SIZE}&offset=${offset}`
      )
      if (!response.ok) {
        throw new Error("Failed to fetch notifications")
      }
      const data = await response.json()
      const list = data.notifications || []
      if (append) {
        setNotifications((prev) => [...prev, ...list])
      } else {
        setNotifications(list)
      }
      setUnreadCount(data.unreadCount ?? 0)
      setHasMore(!!data.hasMore)
    } catch (error) {
      console.error("Error fetching notifications:", error)
      if (!append) setNotifications([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      fetchNotifications(0, false)
    } else {
      setNotifications([])
      setHasMore(false)
    }
  }, [open])

  const handleLoadMore = () => {
    if (loadMoreLoading || !hasMore) return
    fetchNotifications(notifications.length, true)
  }

  const handleClose = () => {
    setNotifications([])
    setHasMore(false)
    closeInitiatedByButton.current = false
    onOpenChange(false)
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      const isMobile =
        typeof window !== "undefined" && window.innerWidth < 768
      if (isMobile && !closeInitiatedByButton.current) {
        return
      }
      handleClose()
    }
  }

  const handleBackButtonClick = () => {
    closeInitiatedByButton.current = true
    handleClose()
  }

  const handleInteractOutside = (e: Event) => {
    const isMobile =
      typeof window !== "undefined" && window.innerWidth < 768
    if (isMobile) {
      e.preventDefault()
    }
  }

  const handleEscapeKeyDown = (e: KeyboardEvent) => {
    const isMobile =
      typeof window !== "undefined" && window.innerWidth < 768
    if (isMobile) {
      e.preventDefault()
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
    const unread = notifications.filter((n) => !n.read)
    if (unread.length === 0) return
    try {
      await Promise.all(
        unread.map((n) =>
          fetch(`/api/notifications/${n.id}/read`, { method: "PATCH" })
        )
      )
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error("Error marking all as read:", error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="w-full max-w-full md:max-w-6xl h-screen md:h-[90vh] p-0 gap-0 rounded-none md:rounded-lg max-h-screen md:max-h-[90vh] top-0 md:top-[50%] left-0 md:left-[50%] translate-x-0 md:translate-x-[-50%] translate-y-0 md:translate-y-[-50%] [&>button]:hidden md:[&>button]:block flex flex-col"
        onInteractOutside={handleInteractOutside}
        onEscapeKeyDown={handleEscapeKeyDown}
      >
        <DialogHeader className="p-3 md:p-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBackButtonClick}
                className="md:hidden h-8 w-8 shrink-0"
                aria-label="Go back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0 flex-1 flex">
                <DialogTitle className="text-base md:text-lg flex items-center gap-2 truncate text-center">
                  <Bell className="h-5 w-5 shrink-0" />
                  Notifications
                  {unreadCount > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {unreadCount}
                    </Badge>
                  )}
                </DialogTitle>
              </div>
            </div>
            {/* <div className="text-sm text-muted-foreground">
            {unreadCount > 0
              ? `${unreadCount} unread`
              : "All caught up!"}
            </div> */}
            {unreadCount > 0 && notifications.some((n) => !n.read) && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllAsRead}
                className="shrink-0"
              >
                Mark all read
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mb-4 opacity-50" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <>
              <div className="space-y-2 flex-1">
                {notifications.map((notification) => (
                  <NotificationCardRow
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={markAsRead}
                  />
                ))}
              </div>
              {hasMore && (
                <div className="pt-4 mt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={handleLoadMore}
                    disabled={loadMoreLoading}
                  >
                    {loadMoreLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      "Load more"
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
