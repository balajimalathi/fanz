"use client"

import Image from "next/image"
import { HlsVideoPlayer } from "@/components/video/hls-video-player"
import { useEffect, useState } from "react"

interface PostMedia {
  id: string
  mediaType: "image" | "video"
  url: string
  thumbnailUrl: string | null
  hlsUrl: string | null
  blurThumbnailUrl: string | null
  metadata?: Record<string, unknown>
  orderIndex: number
}

interface PostMediaDisplayProps {
  media: PostMedia[]
  postId: string
  userId: string | null
  onSubscribe?: () => void
}

export function PostMediaDisplay({
  media,
  postId,
  userId,
  onSubscribe,
}: PostMediaDisplayProps) {
  const [hasAccess, setHasAccess] = useState<boolean>(true)
  const [isCheckingAccess, setIsCheckingAccess] = useState(true)

  useEffect(() => {
    const checkAccess = async () => {
      if (!userId) {
        setHasAccess(false)
        setIsCheckingAccess(false)
        return
      }

      try {
        const response = await fetch(`/api/posts/${postId}/access`)
        if (response.ok) {
          const data = await response.json()
          setHasAccess(data.hasAccess)
        } else {
          setHasAccess(false)
        }
      } catch (error) {
        console.error("Error checking access:", error)
        setHasAccess(false)
      } finally {
        setIsCheckingAccess(false)
      }
    }

    checkAccess()
  }, [userId, postId])

  if (isCheckingAccess) {
    return (
      <div className="space-y-4">
        {media.map((item) => (
          <div
            key={item.id}
            className="aspect-video bg-muted rounded-lg animate-pulse"
          />
        ))}
      </div>
    )
  }

  // Sort media by orderIndex
  const sortedMedia = [...media].sort((a, b) => a.orderIndex - b.orderIndex)

  return (
    <div className="space-y-4">
      {sortedMedia.map((item) => {
        if (item.mediaType === "video") {
          return (
            <HlsVideoPlayer
              key={item.id}
              video={{
                id: item.id,
                hlsUrl: item.hlsUrl,
                thumbnailUrl: item.thumbnailUrl,
                blurThumbnailUrl: item.blurThumbnailUrl,
                url: item.url,
                metadata: item.metadata,
              }}
              hasAccess={hasAccess}
              postId={postId}
              onSubscribe={onSubscribe}
            />
          )
        } else {
          // Image media
          return (
            <div
              key={item.id}
              className="relative aspect-video bg-muted rounded-lg overflow-hidden"
            >
              {item.url ? (
                <Image
                  src={item.url}
                  alt="Post media"
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  No image available
                </div>
              )}
            </div>
          )
        }
      })}
    </div>
  )
}

