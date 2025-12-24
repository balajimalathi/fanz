import Image from "next/image"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

interface ProfileHeaderProps {
  displayName: string
  username: string
  bio: string | null
  profileImageUrl: string | null
  profileCoverUrl: string | null
}

export function ProfileHeader({
  displayName,
  username,
  bio,
  profileImageUrl,
  profileCoverUrl,
}: ProfileHeaderProps) {
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
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
            {displayName}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            @{username}
          </p>
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
    </div>
  )
}

