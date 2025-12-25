"use client"

import { useState } from "react"
import { useChatContext } from "@/lib/chat/chat-context"
import Image from "next/image"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { FollowButton } from "./follow-button"
import { CustomerProfileModal } from "./customer-profile-modal"
import { Button } from "@/components/ui/button"
import { User } from "lucide-react"
import { useSession } from "@/lib/auth/auth-client"
import { NotificationPermission } from "@/components/push/notification-permission"
import { PWAInstallButton } from "@/components/push/pwa-install-button"
import { MessageCircle } from "lucide-react"

interface ProfileHeaderProps {
  displayName: string
  username: string
  bio: string | null
  profileImageUrl: string | null
  profileCoverUrl: string | null
  creatorId: string
  onOpenChat?: () => void
}

export function ProfileHeader({
  displayName,
  username,
  bio,
  profileImageUrl,
  profileCoverUrl,
  creatorId,
  onOpenChat,
}: ProfileHeaderProps) {
  const { data: session } = useSession()
  const [showProfileModal, setShowProfileModal] = useState(false)
  const chatContext = useChatContext()
  const isAuthenticated = !!session?.user
  
  const handleOpenChat = () => {
    if (chatContext) {
      chatContext.openChat()
    } else if (onOpenChat) {
      onOpenChat()
    }
  }

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

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
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5" />
        )}
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

        {/* Name and Username */}
        <div className="space-y-1 sm:space-y-2 mb-3 sm:mb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
                {displayName}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                @{username}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <FollowButton creatorId={creatorId} /> 
              {isAuthenticated && (
                <>
                  {(chatContext || onOpenChat) && (
                    <Button
                      variant="outline"
                      onClick={handleOpenChat}
                      className="flex items-center gap-2"
                      title="Send message"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span className="hidden sm:inline">Message</span>
                    </Button>
                  )}
                  <NotificationPermission />
                  <PWAInstallButton />
                  <Button
                    variant="outline"
                    onClick={() => setShowProfileModal(true)}
                    className="flex items-center gap-2"
                  >
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">Profile</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Bio */}
        {bio && (
          <div className="max-w-2xl">
            <p className="text-sm sm:text-base text-foreground whitespace-pre-line leading-relaxed">
              {bio}
            </p>
          </div>
        )}
      </div>
      <CustomerProfileModal
        open={showProfileModal}
        onOpenChange={setShowProfileModal}
      />
    </div>
  )
}

