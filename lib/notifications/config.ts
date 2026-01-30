import type { LucideIcon } from "lucide-react"
import {
  Bell,
  ShoppingBag,
  PlayCircle,
  CheckCircle2,
  UserPlus,
  CreditCard,
  Video,
  FileText,
  Megaphone,
  MessageSquare,
  Heart,
  AlertCircle,
} from "lucide-react"

export const notificationTypeConfig: Record<
  string,
  { icon: LucideIcon; bgColor: string; iconColor: string }
> = {
  service_order: {
    icon: ShoppingBag,
    bgColor: "bg-blue-100 dark:bg-blue-950",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  service_order_activated: {
    icon: PlayCircle,
    bgColor: "bg-purple-100 dark:bg-purple-950",
    iconColor: "text-purple-600 dark:text-purple-400",
  },
  service_order_fulfilled: {
    icon: CheckCircle2,
    bgColor: "bg-green-100 dark:bg-green-950",
    iconColor: "text-green-600 dark:text-green-400",
  },
  membership_subscription: {
    icon: UserPlus,
    bgColor: "bg-emerald-100 dark:bg-emerald-950",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  post_purchase: {
    icon: CreditCard,
    bgColor: "bg-amber-100 dark:bg-amber-950",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  live_stream_purchase: {
    icon: Video,
    bgColor: "bg-pink-100 dark:bg-pink-950",
    iconColor: "text-pink-600 dark:text-pink-400",
  },
  new_post: {
    icon: FileText,
    bgColor: "bg-indigo-100 dark:bg-indigo-950",
    iconColor: "text-indigo-600 dark:text-indigo-400",
  },
  broadcast: {
    icon: Megaphone,
    bgColor: "bg-orange-100 dark:bg-orange-950",
    iconColor: "text-orange-600 dark:text-orange-400",
  },
  announcement: {
    icon: Megaphone,
    bgColor: "bg-teal-100 dark:bg-teal-950",
    iconColor: "text-teal-600 dark:text-teal-400",
  },
  new_follower: {
    icon: UserPlus,
    bgColor: "bg-cyan-100 dark:bg-cyan-950",
    iconColor: "text-cyan-600 dark:text-cyan-400",
  },
  new_message: {
    icon: MessageSquare,
    bgColor: "bg-violet-100 dark:bg-violet-950",
    iconColor: "text-violet-600 dark:text-violet-400",
  },
  comment: {
    icon: MessageSquare,
    bgColor: "bg-sky-100 dark:bg-sky-950",
    iconColor: "text-sky-600 dark:text-sky-400",
  },
  like: {
    icon: Heart,
    bgColor: "bg-rose-100 dark:bg-rose-950",
    iconColor: "text-rose-600 dark:text-rose-400",
  },
  system: {
    icon: AlertCircle,
    bgColor: "bg-gray-100 dark:bg-gray-800",
    iconColor: "text-gray-600 dark:text-gray-400",
  },
}

export function getNotificationConfig(type: string) {
  return (
    notificationTypeConfig[type] || {
      icon: Bell,
      bgColor: "bg-gray-100 dark:bg-gray-800",
      iconColor: "text-gray-600 dark:text-gray-400",
    }
  )
}

export interface NotificationItem {
  id: string
  type: string
  title: string
  message: string
  link: string | null
  read: boolean
  createdAt: string
}
