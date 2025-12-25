"use client"

import Image from "next/image"
import { HlsVideoPlayer } from "@/components/video/hls-video-player"
import { ImageCarousel } from "@/components/post/image-carousel"

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
}

export function PostMediaDisplay({
  media,
  postId,
  userId,
}: PostMediaDisplayProps) {
  // Sort media by orderIndex
  const sortedMedia = [...media].sort((a, b) => a.orderIndex - b.orderIndex)

  // Separate images and videos
  const images = sortedMedia.filter((item) => item.mediaType === "image")
  const videos = sortedMedia.filter((item) => item.mediaType === "video")

  return (
    <div className="space-y-4">
      {/* Images - show in carousel if multiple, single image if one */}
      {images.length > 0 && (
        <ImageCarousel
          images={images.map((img) => ({
            id: img.id,
            url: img.url,
            blurThumbnailUrl: img.blurThumbnailUrl,
          }))}
        />
      )}

      {/* Videos */}
      {videos.map((item) => (
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
          postId={postId}
        />
      ))}
    </div>
  )
}

