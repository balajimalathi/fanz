import {
  AudioWaveform,
  Bell,
  Blocks,
  Calendar,
  Command,
  GalleryVertical,
  Home,
  Image,
  Inbox,
  MessageCircleQuestion,
  Plus,
  Settings2,
  Smartphone,
  Sparkle,
  Trash2,
  type LucideIcon,
} from "lucide-react"

// Icon mapping for serializable data
export const iconMap: Record<string, LucideIcon> = {
  Home,
  Sparkle,
  Smartphone,
  Bell,
  Inbox,
  Calendar,
  Plus,
  GalleryVertical,
  Settings2,
  Blocks,
  Trash2,
  MessageCircleQuestion,
  Command,
  AudioWaveform,
}

// Serializable data (for server-to-client passing)
export const sidebarDataSerializable = {
  navMain: [
    {
      title: "Home",
      url: "#",
      icon: "Home",
      isActive: true,
    },
    {
      title: "My App",
      url: "/home/my-app",
      icon: "Sparkle",
    },
    {
      title: "Post",
      url: "/home/create",
      icon: "Plus",
    },
    {
      title: "Feed",
      url: "#",
      icon: "GalleryVertical",
    },
    {
      title: "Notifications",
      url: "#",
      icon: "Bell",
    },
    {
      title: "Inbox",
      url: "#",
      icon: "Inbox",
      badge: "10",
    },
  ],
}

// This is sample data with icon components (for client components)
export const sidebarData = {
  teams: [
    {
      name: "Acme Inc",
      logo: Command,
      plan: "Enterprise",
    },
    {
      name: "Acme Corp.",
      logo: AudioWaveform,
      plan: "Startup",
    },
    {
      name: "Evil Corp.",
      logo: Command,
      plan: "Free",
    },
  ],
  navMain: [
    {
      title: "Home",
      url: "#",
      icon: Home,
      isActive: true,
    },
    {
      title: "My App",
      url: "/home/my-app",
      icon: Sparkle,
    },
    {
      title: "Feed",
      url: "#",
      icon: GalleryVertical,
    },
    {
      title: "Post",
      url: "/home/create",
      icon: Plus,
    },
    {
      title: "Notifications",
      url: "#",
      icon: Bell,
    },
    {
      title: "Inbox",
      url: "#",
      icon: Inbox,
      badge: "10",
    },
  ],
  navSecondary: [
    {
      title: "Calendar",
      url: "#",
      icon: Calendar,
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings2,
    },
    {
      title: "Templates",
      url: "#",
      icon: Blocks,
    },
    {
      title: "Trash",
      url: "#",
      icon: Trash2,
    },
    {
      title: "Help",
      url: "#",
      icon: MessageCircleQuestion,
    },
  ],
  favorites: [
    // {
    //   name: "Daily Habit Tracker & Goal Setting",
    //   url: "#",
    //   emoji: "✅",
    // },
  ],
  workspaces: [
    // {
    //   name: "Personal Life Management",
    //   emoji: "🏠",
    //   pages: [
    //     {
    //       name: "Daily Journal & Reflection",
    //       url: "#",
    //       emoji: "📔",
    //     },
    //     {
    //       name: "Health & Wellness Tracker",
    //       url: "#",
    //       emoji: "🍏",
    //     },
    //     {
    //       name: "Personal Growth & Learning Goals",
    //       url: "#",
    //       emoji: "🌟",
    //     },
    //   ],
    // },
  ],
}

