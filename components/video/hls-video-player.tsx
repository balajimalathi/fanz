"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Lock } from "lucide-react"

interface HlsVideoPlayerProps {
  video: {
    id: string
    hlsUrl: string | null
    thumbnailUrl: string | null
    blurThumbnailUrl: string | null
    url: string
    metadata?: Record<string, unknown>
  }
  hasAccess: boolean
  postId: string
  onSubscribe?: () => void
}

export function HlsVideoPlayer({
  video,
  hasAccess,
  postId,
  onSubscribe,
}: HlsVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const hlsRef = useRef<any>(null)

  useEffect(() => {
    if (!hasAccess || !video.hlsUrl) {
      setIsLoading(false)
      return
    }

    // Dynamically import hls.js only on client side
    const initHls = async () => {
      try {
        const Hls = (await import("hls.js")).default

        if (Hls.isSupported() && videoRef.current) {
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: false,
          })

          hls.loadSource(video.hlsUrl!)
          hls.attachMedia(videoRef.current)

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setIsLoading(false)
            setError(null)
          })

          hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  console.error("Fatal network error, trying to recover...")
                  hls.startLoad()
                  break
                case Hls.ErrorTypes.MEDIA_ERROR:
                  console.error("Fatal media error, trying to recover...")
                  hls.recoverMediaError()
                  break
                default:
                  console.error("Fatal error, destroying HLS instance")
                  hls.destroy()
                  setError("Failed to load video")
                  setIsLoading(false)
                  break
              }
            }
          })

          hlsRef.current = hls
        } else if (videoRef.current?.canPlayType("application/vnd.apple.mpegurl")) {
          // Native HLS support (Safari)
          videoRef.current.src = video.hlsUrl!
          videoRef.current.addEventListener("loadedmetadata", () => {
            setIsLoading(false)
            setError(null)
          })
          videoRef.current.addEventListener("error", () => {
            setError("Failed to load video")
            setIsLoading(false)
          })
        } else {
          setError("HLS is not supported in this browser")
          setIsLoading(false)
        }
      } catch (err) {
        console.error("Error loading HLS.js:", err)
        setError("Failed to initialize video player")
        setIsLoading(false)
      }
    }

    initHls()

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
      }
    }
  }, [hasAccess, video.hlsUrl])

  if (!hasAccess) {
    return (
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden group">
        {video.blurThumbnailUrl ? (
          <Image
            src={video.blurThumbnailUrl}
            alt="Video preview"
            fill
            className="object-cover blur-sm brightness-50"
            unoptimized
          />
        ) : (
          <div className="w-full h-full bg-gray-900 flex items-center justify-center">
            <Lock className="h-16 w-16 text-gray-600" />
          </div>
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6">
          <div className="text-center">
            <Lock className="h-12 w-12 text-white/80 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">
              Subscribe to Unlock
            </h3>
            <p className="text-white/70 mb-4">
              This video is available for subscribers only
            </p>
            {onSubscribe && (
              <Button
                onClick={onSubscribe}
                size="lg"
                className="bg-primary hover:bg-primary/90"
              >
                Subscribe Now
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (!video.hlsUrl) {
    const processingStatus = video.metadata?.processingStatus as string | undefined
    return (
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
        {processingStatus === "processing" ? (
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p>Processing video...</p>
          </div>
        ) : processingStatus === "failed" ? (
          <div className="text-center text-red-400 p-4">
            <p>Video processing failed</p>
            {/* {video.metadata?.error && (
              <p className="text-sm mt-2">{String(video.metadata.error)}</p>
            )} */}
          </div>
        ) : (
          <div className="text-center text-white">
            <p>Video is being prepared...</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/50">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p>Loading video...</p>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/50">
          <div className="text-center text-red-400 p-4">
            <p>{error}</p>
          </div>
        </div>
      )}
      <video
        ref={videoRef}
        controls
        className="w-full h-full"
        poster={video.thumbnailUrl || undefined}
        playsInline
      >
        Your browser does not support the video tag.
      </video>
    </div>
  )
}

