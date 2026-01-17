"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Loader2, Lock, Play, ImageIcon, X, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { HlsVideoPlayer } from "@/components/video/hls-video-player"

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

interface GalleryPost {
  id: string
  postType: "subscription" | "exclusive" | "free"
  price: number | null
  media: PostMedia[]
  hasAccess: boolean
}

interface GallerySectionProps {
  username: string
}

export function GallerySection({ username }: GallerySectionProps) {
  const [posts, setPosts] = useState<GalleryPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  useEffect(() => {
    const fetchGalleryMedia = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Fetch all posts (we'll paginate if needed in future)
        const response = await fetch(`/api/posts/creator/${username}?limit=100`)
        if (!response.ok) {
          throw new Error("Failed to fetch gallery media")
        }

        const data = await response.json()
        
        // Filter posts that have media and extract media items
        const postsWithMedia = data.posts
          .filter((post: any) => post.media && post.media.length > 0)
          .map((post: any) => ({
            id: post.id,
            postType: post.postType,
            price: post.price,
            media: post.media,
            hasAccess: post.hasAccess,
          }))

        setPosts(postsWithMedia)
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
        console.error("Error fetching gallery:", err)
      } finally {
        setIsLoading(false)
      }
    }

    if (username) {
      fetchGalleryMedia()
    }
  }, [username])

  // Flatten all media from all posts for grid display
  const allMedia = posts.flatMap((post) =>
    post.media.map((media) => ({
      ...media,
      postId: post.id,
      postType: post.postType,
      price: post.price,
      hasAccess: post.hasAccess,
    }))
  )

  // Handle keyboard navigation in lightbox
  useEffect(() => {
    if (!lightboxOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        setLightboxIndex((prev) => (prev - 1 + allMedia.length) % allMedia.length)
      }
      if (e.key === "ArrowRight") {
        setLightboxIndex((prev) => (prev + 1) % allMedia.length)
      }
      if (e.key === "Escape") {
        setLightboxOpen(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [lightboxOpen, allMedia.length])

  const openLightbox = (index: number) => {
    const item = allMedia[index]
    if (!item.hasAccess) {
      // Show toast for locked content
      const message =
        item.postType === "exclusive"
          ? "This is a premium post. Purchase to unlock."
          : item.postType === "subscription"
          ? "This requires a membership. Subscribe to unlock."
          : "This content is locked."
      toast.info(message)
      return
    }
    setLightboxIndex(index)
    setLightboxOpen(true)
  }

  const closeLightbox = () => {
    setLightboxOpen(false)
  }

  const lightboxNext = () => {
    setLightboxIndex((prev) => (prev + 1) % allMedia.length)
  }

  const lightboxPrev = () => {
    setLightboxIndex((prev) => (prev - 1 + allMedia.length) % allMedia.length)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading gallery...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (allMedia.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-muted-foreground text-sm">No media available yet.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Gallery</h2>
        <p className="text-muted-foreground mt-1">
          {allMedia.length} {allMedia.length === 1 ? "item" : "items"}
        </p>
      </div>

      {/* Grid of media items */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
        {allMedia.map((item, index) => {
          const displayUrl = item.hasAccess ? item.url : item.blurThumbnailUrl || item.thumbnailUrl
          const isLocked = !item.hasAccess

          return (
            <button
              key={`${item.postId}-${item.id}`}
              onClick={() => openLightbox(index)}
              className="group relative aspect-square overflow-hidden rounded-lg bg-muted cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              {/* Media thumbnail */}
              <div className="relative w-full h-full">
                {item.mediaType === "image" ? (
                  <>
                    {displayUrl ? (
                      <Image
                        src={displayUrl}
                        alt="Gallery image"
                        fill
                        className={cn(
                          "object-cover transition-transform duration-300 group-hover:scale-105",
                          isLocked && "blur-md"
                        )}
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {displayUrl ? (
                      <>
                        <Image
                          src={displayUrl}
                          alt="Video thumbnail"
                          fill
                          className={cn(
                            "object-cover transition-transform duration-300 group-hover:scale-105",
                            isLocked && "blur-md"
                          )}
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                          <Play className="h-8 w-8 sm:h-10 sm:w-10 text-white drop-shadow-lg" />
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <Play className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </>
                )}

                {/* Lock overlay for locked content */}
                {isLocked && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/50 transition-colors">
                    <Lock className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                  </div>
                )}

                {/* Post type badge */}
                {!item.hasAccess && (item.postType === "exclusive" || item.postType === "subscription") && (
                  <div className="absolute top-2 right-2">
                    <div className="bg-black/70 text-white text-xs px-2 py-1 rounded">
                      {item.postType === "exclusive" ? "Premium" : "Membership"}
                    </div>
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && allMedia[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={closeLightbox}
          role="dialog"
          aria-modal="true"
          aria-label="Media lightbox"
        >
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
            onClick={closeLightbox}
          >
            <X className="h-6 w-6" />
          </Button>

          {/* Navigation buttons */}
          {allMedia.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 z-50 text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation()
                  lightboxPrev()
                }}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 z-50 text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation()
                  lightboxNext()
                }}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}

          {/* Lightbox content */}
          <div
            className="relative w-full h-full flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {allMedia[lightboxIndex].mediaType === "image" ? (
              <Image
                src={allMedia[lightboxIndex].url}
                alt="Gallery image"
                width={1920}
                height={1080}
                className="max-w-full max-h-full object-contain"
                unoptimized
                priority
              />
            ) : (
              <div className="w-full max-w-6xl aspect-video">
                <HlsVideoPlayer
                  video={{
                    id: allMedia[lightboxIndex].id,
                    hlsUrl: allMedia[lightboxIndex].hlsUrl,
                    thumbnailUrl: allMedia[lightboxIndex].thumbnailUrl,
                    blurThumbnailUrl: allMedia[lightboxIndex].blurThumbnailUrl,
                    url: allMedia[lightboxIndex].url,
                    metadata: allMedia[lightboxIndex].metadata,
                  }}
                  postId={allMedia[lightboxIndex].postId}
                  hasAccess={allMedia[lightboxIndex].hasAccess}
                />
              </div>
            )}
          </div>

          {/* Counter */}
          {allMedia.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 text-white text-sm">
              {lightboxIndex + 1} / {allMedia.length}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
