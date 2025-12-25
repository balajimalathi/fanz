"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import Image from "next/image"

interface HlsVideoPlayerProps {
  video: {
    id: string
    hlsUrl: string | null
    thumbnailUrl: string | null
    blurThumbnailUrl: string | null
    url: string
    metadata?: Record<string, unknown>
  }
  postId: string
  hasAccess?: boolean
}

export function HlsVideoPlayer({
  video,
  postId,
  hasAccess = true,
}: HlsVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [useFallback, setUseFallback] = useState(false)
  const hlsRef = useRef<any>(null)

  // Fallback to original video when HLS fails
  const activateFallback = useCallback(() => {
    if (!video.url) {
      setError("Video is not available")
      setIsLoading(false)
      return
    }
    console.log("Activating fallback to original video URL:", video.url)
    setUseFallback(true)
    setError(null)
    setIsLoading(true)
    
    // Set video source to original URL
    if (videoRef.current) {
      videoRef.current.src = video.url
      videoRef.current.load()
    }
  }, [video.url])

  useEffect(() => {
    // If already in fallback mode, handle fallback video loading
    if (useFallback && video.url) {
      if (!videoRef.current) return

      const handleLoadedMetadata = () => {
        setIsLoading(false)
        setError(null)
      }

      const handleError = () => {
        setError("Failed to load video")
        setIsLoading(false)
      }

      const handleCanPlay = () => {
        setIsLoading(false)
      }

      videoRef.current.addEventListener("loadedmetadata", handleLoadedMetadata)
      videoRef.current.addEventListener("error", handleError)
      videoRef.current.addEventListener("canplay", handleCanPlay)

      return () => {
        if (videoRef.current) {
          videoRef.current.removeEventListener("loadedmetadata", handleLoadedMetadata)
          videoRef.current.removeEventListener("error", handleError)
          videoRef.current.removeEventListener("canplay", handleCanPlay)
        }
      }
    }

    if (!video.hlsUrl || useFallback) {
      if (useFallback) {
        // Fallback mode is handled above
        return
      }
      setIsLoading(false)
      return
    }

    // Dynamically import hls.js only on client side
    const initHls = async () => {
      try {
        // First, verify the manifest is accessible
        try {
          const response = await fetch(video.hlsUrl!, {
            method: "HEAD",
            mode: "cors",
          })
          if (!response.ok && response.status !== 0) {
            console.warn(`Manifest check returned status ${response.status}`)
          }
        } catch (fetchError) {
          console.warn("Manifest accessibility check failed (may be CORS):", fetchError)
          // Continue anyway - might work with HLS.js
        }

        const Hls = (await import("hls.js")).default

        if (Hls.isSupported() && videoRef.current) {
          let retryCount = 0
          const maxRetries = 2

          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: false,
            xhrSetup: (xhr, url) => {
              // Enable CORS for HLS requests
              xhr.withCredentials = false
            },
          })

          hls.loadSource(video.hlsUrl!)
          hls.attachMedia(videoRef.current)

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setIsLoading(false)
            setError(null)
            retryCount = 0 // Reset retry count on success
          })

          hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  const errorDetails = data.response
                    ? `Status: ${data.response.code}, URL: ${data.url || video.hlsUrl}`
                    : `URL: ${data.url || video.hlsUrl}`
                  
                  console.error("Fatal network error:", {
                    type: data.type,
                    details: data.details,
                    url: data.url || video.hlsUrl,
                    response: data.response,
                    error: data.error,
                  })

                  // Retry logic
                  if (retryCount < maxRetries) {
                    retryCount++
                    console.log(`Retrying HLS load (attempt ${retryCount}/${maxRetries})...`)
                    try {
                      hls.startLoad()
                    } catch (e) {
                      console.error("Failed to retry:", e)
                      retryCount = maxRetries // Stop retrying
                    }
                  } else {
                    // Max retries reached - fallback to original video
                    hls.destroy()
                    activateFallback()
                  }
                  break
                case Hls.ErrorTypes.MEDIA_ERROR:
                  console.error("Fatal media error:", data)
                  try {
                    hls.recoverMediaError()
                  } catch (e) {
                    console.error("Failed to recover from media error:", e)
                    // Media error recovery failed - fallback to original video
                    hls.destroy()
                    activateFallback()
                  }
                  break
                default:
                  console.error("Fatal error:", data)
                  // Unknown fatal error - fallback to original video
                  hls.destroy()
                  activateFallback()
                  break
              }
            } else {
              // Non-fatal errors - log but don't stop playback
              console.warn("Non-fatal HLS error:", data)
            }
          })

          hlsRef.current = hls
        } else if (videoRef.current?.canPlayType("application/vnd.apple.mpegurl")) {
          // Native HLS support (Safari)
          // Don't set crossOrigin for native HLS - let Safari handle CORS
          videoRef.current.src = video.hlsUrl!
          
          const handleLoadedMetadata = () => {
            setIsLoading(false)
            setError(null)
          }

          const handleError = (e: Event) => {
            console.error("Native HLS error:", e)
            // Native HLS failed - fallback to original video
            activateFallback()
          }

          videoRef.current.addEventListener("loadedmetadata", handleLoadedMetadata)
          videoRef.current.addEventListener("error", handleError)
          
          // Cleanup listeners
          return () => {
            if (videoRef.current) {
              videoRef.current.removeEventListener("loadedmetadata", handleLoadedMetadata)
              videoRef.current.removeEventListener("error", handleError)
            }
          }
        } else {
          // HLS not supported - fallback to original video
          console.log("HLS not supported, using fallback")
          activateFallback()
        }
      } catch (err) {
        console.error("Error loading HLS.js:", err)
        // HLS.js initialization failed - fallback to original video
        activateFallback()
      }
    }

    initHls()

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
      }
    }
  }, [video.hlsUrl, video.url, useFallback, activateFallback])

  // Handle case when no HLS URL is available - use fallback
  useEffect(() => {
    if (!video.hlsUrl && video.url && !useFallback) {
      const processingStatus = video.metadata?.processingStatus as string | undefined
      // If processing is complete, failed, or not set, use fallback immediately
      if (!processingStatus || processingStatus === "ready" || processingStatus === "failed") {
        activateFallback()
      }
    }
  }, [video.hlsUrl, video.url, useFallback, activateFallback])

  // If no access, show blur thumbnail (server already filtered URLs)
  if (!hasAccess) {
    return (
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
        {video.blurThumbnailUrl ? (
          <Image
            src={video.blurThumbnailUrl}
            alt="Video thumbnail"
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="w-full h-full bg-primary flex items-center justify-center">
            <p className="text-primary-foreground text-sm">Video</p>
          </div>
        )}
      </div>
    )
  }

  // Show processing message if video is still processing and no HLS URL
  if (!video.hlsUrl && video.url && !useFallback) {
    const processingStatus = video.metadata?.processingStatus as string | undefined
    if (processingStatus === "processing") {
      return (
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p>Processing video...</p>
          </div>
        </div>
      )
    }
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
        src={useFallback ? video.url : undefined}
        // Note: When using HLS, src is set by HLS.js or native HLS
        // When using fallback, src is set to video.url
        // crossOrigin is not set here - HLS.js handles CORS via xhrSetup
        // Setting crossOrigin="anonymous" can cause CORS issues if R2 bucket doesn't have proper headers
      >
        Your browser does not support the video tag.
      </video>
    </div>
  )
}

