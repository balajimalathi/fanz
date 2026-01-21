"use client"

import { useEffect, useState } from "react"
import { Users, Image as ImageIcon, Video, Heart } from "lucide-react"

interface CreatorStatsProps {
  username: string
}

interface Stats {
  followers: number
  images: number
  videos: number
  likes: number
}

export function CreatorStats({ username }: CreatorStatsProps) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`/api/creator/${username}/stats`)
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (error) {
        console.error("Error fetching creator stats:", error)
      } finally {
        setLoading(false)
      }
    }

    if (username) {
      fetchStats()
    }
  }, [username])

  if (loading || !stats) {
    return (
      <div className="flex items-center gap-6 text-sm">
        <div className="h-5 w-16 bg-muted animate-pulse rounded" />
        <div className="h-5 w-16 bg-muted animate-pulse rounded" />
        <div className="h-5 w-16 bg-muted animate-pulse rounded" />
        <div className="h-5 w-16 bg-muted animate-pulse rounded" />
      </div>
    )
  }

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M"
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K"
    }
    return num.toLocaleString()
  }

  return (
    <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
      {/* Followers */}
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">
          <span className="text-foreground">{formatNumber(stats.followers)}</span>
          <span className="text-muted-foreground ml-1">followers</span>
        </span>
      </div>

      {/* Images */}
      <div className="flex items-center gap-2">
        <ImageIcon className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">
          <span className="text-foreground">{formatNumber(stats.images)}</span>
          <span className="text-muted-foreground ml-1">images</span>
        </span>
      </div>

      {/* Videos */}
      <div className="flex items-center gap-2">
        <Video className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">
          <span className="text-foreground">{formatNumber(stats.videos)}</span>
          <span className="text-muted-foreground ml-1">videos</span>
        </span>
      </div>

      {/* Likes */}
      <div className="flex items-center gap-2">
        <Heart className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">
          <span className="text-foreground">{formatNumber(stats.likes)}</span>
          <span className="text-muted-foreground ml-1">likes</span>
        </span>
      </div>
    </div>
  )
}
