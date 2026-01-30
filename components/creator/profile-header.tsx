"use client"

import { useState } from "react"
import Image from "next/image"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { FollowButton } from "./follow-button"
import { CustomerProfileModal } from "./customer-profile-modal"
import { Button } from "@/components/ui/button"
import { User, Flag, MessageCircle, ShoppingBag, Bell } from "lucide-react"
import { useSession } from "@/lib/auth/auth-client"
import { NotificationPermission } from "@/components/push/notification-permission"
import { PWAInstallButton } from "@/components/push/pwa-install-button"
import { LiveIndicator } from "@/components/livekit/live-indicator"
import { useLiveHandler } from "@/app/(app)/u/[username]/_components/live-handler-context"
import { ReportCreatorDialog } from "@/components/report/report-creator-dialog"
import { FanCreditsDisplay } from "./fan-credits-display"
import { CreatorStats } from "./creator-stats"
import { Icons } from "@/components/ui/icons"
import Link from "next/link"
import { useChatOrdersHandler } from "@/app/(app)/u/[username]/_components/chat-orders-handler-context"

// Helper function to construct social media URLs from handles
function getSocialMediaUrl(platform: string, handle: string): string {
  if (!handle) return ""

  const normalizedHandle = handle.replace(/^@+/, "")

  switch (platform) {
    case "instagram":
      return `https://instagram.com/${normalizedHandle}`
    case "twitter":
      return `https://twitter.com/${normalizedHandle}`
    case "facebook":
      return `https://facebook.com/${normalizedHandle}`
    case "telegram":
      return `https://t.me/${normalizedHandle}`
    case "tiktok":
      return `https://tiktok.com/@${normalizedHandle}`
    case "snapchat":
      return `https://snapchat.com/add/${normalizedHandle}`
    case "youtube":
      return `https://youtube.com/@${normalizedHandle}`
    case "linkedin":
      return `https://linkedin.com/in/${normalizedHandle}`
    default:
      return ""
  }
}

interface ProfileHeaderProps {
  displayName: string
  username: string
  bio: string | null
  profileImageUrl: string | null
  profileCoverUrl: string | null
  creatorId: string
  socialMediaLinks?: {
    instagram?: string;
    twitter?: string;
    facebook?: string;
    telegram?: string;
    tiktok?: string;
    snapchat?: string;
    youtube?: string;
    linkedin?: string;
  } | null
}

export function ProfileHeader({
  displayName,
  username,
  bio,
  profileImageUrl,
  profileCoverUrl,
  creatorId,
  socialMediaLinks,
}: ProfileHeaderProps) {
  const { data: session } = useSession()
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showReportDialog, setShowReportDialog] = useState(false)
  const isAuthenticated = !!session?.user
  const liveHandler = useLiveHandler()

  // Don't show report button if user is reporting themselves
  const canReport = isAuthenticated && session?.user?.id !== creatorId

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  // Get user's initials for avatar fallback
  const userInitials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U"

  return (
    <div className="relative w-full">
      {/* Cover Image */}
      <div className="relative w-full h-[200px] sm:h-[300px] bg-muted overflow-hidden">
        {profileCoverUrl ? (
          <Image
            src={profileCoverUrl}
            alt={`${displayName}'s cover`}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="w-full h-full bg-linear-to-br from-primary/20 to-primary/5" />
        )}

        {/* Utility Actions - Floating on cover image (top-right) */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          {isAuthenticated && (
            <>
              <NotificationPermission />
              <PWAInstallButton />
              <button
                type="button"
                onClick={() => setShowProfileModal(true)}
                className="h-9 w-9 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background border-2 border-background/50 transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                <Avatar className="h-full w-full">
                  {session?.user?.image ? (
                    <AvatarImage src={session.user.image} alt={session.user.name || "User"} />
                  ) : (
                    <AvatarFallback className="text-xs font-semibold bg-muted">
                      {userInitials}
                    </AvatarFallback>
                  )}
                </Avatar>
              </button>
            </>
          )}
          {canReport && (
            <Button
              variant="secondary"
              size="icon"
              onClick={() => setShowReportDialog(true)}
              className="h-9 w-9 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background"
            >
              <Flag className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Profile Section */}
      <div className="relative px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8">
        {/* Profile Image - Overlapping Cover */}
        <div className="relative -mt-12 sm:-mt-16 mb-4 sm:mb-6">
          <Avatar className="h-20 w-20 sm:h-24 sm:w-24 md:h-32 md:w-32 border-4 border-background shadow-lg">
            {profileImageUrl ? (
              <AvatarImage src={profileImageUrl} alt={displayName} />
            ) : (
              <AvatarFallback className="text-lg sm:text-xl md:text-2xl font-semibold">
                {initials}
              </AvatarFallback>
            )}
          </Avatar>
        </div>

        {/* Name, Username and Primary Actions */}
        <div className="space-y-1 sm:space-y-2 mb-3 sm:mb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
                  {displayName}
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground">
                  @{username}
                </p>
              </div>
              {liveHandler && (
                <LiveIndicator creatorId={creatorId} onClick={liveHandler.onLiveClick} />
              )}
              {/* Primary Actions - Follow and Credits */}
              <div className="flex items-center gap-2">
                {isAuthenticated && <FanCreditsDisplay creatorId={creatorId} />}
                <FollowButton creatorId={creatorId} />
              </div>
            </div>
            {/* Chat, Orders, and Notifications Buttons */}
            {(() => {
              const chatOrdersHandler = useChatOrdersHandler()
              if (!chatOrdersHandler || chatOrdersHandler.isCreator) {
                return null
              }
              return (
                <div className="flex items-center gap-2">
                  <Button
                    onClick={chatOrdersHandler.onNotificationsClick}
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    aria-label="Notifications"
                  >
                    <Bell className="h-4 w-4" />
                  </Button>
                  {chatOrdersHandler.chatEnabled && (
                    <Button
                      onClick={chatOrdersHandler.onChatClick}
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  )}
                  {chatOrdersHandler.hasOrdersFromCreator && (
                    <Button
                      onClick={chatOrdersHandler.onOrdersClick}
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                    >
                      <ShoppingBag className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )
            })()}

          </div>
        </div>

        {/* Creator Stats */}
        <div className="mb-4">
          <CreatorStats username={username} />
        </div>

        {/* Bio */}
        {bio && (
          <div className="max-w-2xl">
            <p className="text-sm sm:text-base text-foreground whitespace-pre-line leading-relaxed">
              {bio}
            </p>
          </div>
        )}

        {/* Social Media Links */}
        {socialMediaLinks && Object.keys(socialMediaLinks).length > 0 && (
          <div className="flex flex-wrap items-center gap-3 mt-4">
            {socialMediaLinks.instagram && (
              <Link
                href={getSocialMediaUrl("instagram", socialMediaLinks.instagram)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Instagram"
              >
                <Icons.instagram className="h-5 w-5" />
              </Link>
            )}
            {socialMediaLinks.twitter && (
              <Link
                href={getSocialMediaUrl("twitter", socialMediaLinks.twitter)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Twitter"
              >
                <Icons.twitter className="h-6 w-6 bg-muted rounded-full p-1" />
              </Link>
            )}
            {socialMediaLinks.facebook && (
              <Link
                href={getSocialMediaUrl("facebook", socialMediaLinks.facebook)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Facebook"
              >
                <Icons.facebook className="h-8 w-8" />
              </Link>
            )}
            {socialMediaLinks.telegram && (
              <Link
                href={getSocialMediaUrl("telegram", socialMediaLinks.telegram)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Telegram"
              >
                <Icons.telegram className="h-5 w-5" />
              </Link>
            )}
            {socialMediaLinks.tiktok && (
              <Link
                href={getSocialMediaUrl("tiktok", socialMediaLinks.tiktok)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="TikTok"
              >
                <Icons.tiktok className="h-5 w-5" />
              </Link>
            )}
            {socialMediaLinks.snapchat && (
              <Link
                href={getSocialMediaUrl("snapchat", socialMediaLinks.snapchat)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Snapchat"
              >
                <Icons.snapchat className="h-6 w-6" />
              </Link>
            )}
            {socialMediaLinks.youtube && (
              <Link
                href={getSocialMediaUrl("youtube", socialMediaLinks.youtube)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="YouTube"
              >
                <Icons.youtube className="h-5 w-5" />
              </Link>
            )}
            {socialMediaLinks.linkedin && (
              <Link
                href={getSocialMediaUrl("linkedin", socialMediaLinks.linkedin)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="LinkedIn"
              >
                <Icons.linkedin className="h-5 w-5" />
              </Link>
            )}
          </div>
        )}
      </div>
      <CustomerProfileModal
        open={showProfileModal}
        onOpenChange={setShowProfileModal}
      />
      <ReportCreatorDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        creatorId={creatorId}
      />
    </div>
  )
}

