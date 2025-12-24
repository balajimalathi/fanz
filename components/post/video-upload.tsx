"use client"

import { useState, useCallback, useRef } from "react"
import { Upload, X, Loader2, Video } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface VideoFile {
  file: File
  preview: string | null
  id: string
  uploadStatus?: "pending" | "uploading" | "processing" | "ready" | "error"
  uploadProgress?: number
}

interface VideoUploadProps {
  videos: VideoFile[]
  onVideosChange: (videos: VideoFile[]) => void
  maxVideos?: number
  disabled?: boolean
}

function validateVideoFile(file: File): string | null {
  if (!file.type.startsWith("video/")) {
    return "File must be a video"
  }

  const maxSize = 500 * 1024 * 1024 // 500MB
  if (file.size > maxSize) {
    return "File size must be less than 500MB"
  }

  return null
}

export function VideoUpload({
  videos,
  onVideosChange,
  maxVideos = 1,
  disabled = false,
}: VideoUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return

      const newVideos: VideoFile[] = []
      const remainingSlots = maxVideos - videos.length

      Array.from(files)
        .slice(0, remainingSlots)
        .forEach((file) => {
          const error = validateVideoFile(file)
          if (error) {
            alert(error)
            return
          }

          const id = Math.random().toString(36).substring(2, 15)
          // For videos, we can't easily create a preview, so we'll use null
          // and show a video icon instead
          newVideos.push({
            file,
            preview: null,
            id,
            uploadStatus: "pending",
          })
        })

      if (newVideos.length > 0) {
        onVideosChange([...videos, ...newVideos])
      }
    },
    [videos, maxVideos, onVideosChange]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) {
      setIsDragging(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      if (disabled) return

      const files = e.dataTransfer.files
      handleFileSelect(files)
    },
    [handleFileSelect, disabled]
  )

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFileSelect(e.target.files)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    },
    [handleFileSelect]
  )

  const removeVideo = useCallback(
    (id: string) => {
      const videoToRemove = videos.find((vid) => vid.id === id)
      if (videoToRemove?.preview) {
        URL.revokeObjectURL(videoToRemove.preview)
      }
      onVideosChange(videos.filter((vid) => vid.id !== id))
    },
    [videos, onVideosChange]
  )

  const canAddMore = videos.length < maxVideos

  const getStatusText = (status?: string) => {
    switch (status) {
      case "uploading":
        return "Uploading..."
      case "processing":
        return "Processing..."
      case "ready":
        return "Ready"
      case "error":
        return "Error"
      default:
        return "Pending"
    }
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      {canAddMore && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            multiple={maxVideos > 1}
            onChange={handleFileInputChange}
            disabled={disabled}
            className="hidden"
          />
          <Video className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground mb-2">
            Drag and drop video here, or{" "}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="text-primary hover:underline"
            >
              click to browse
            </button>
          </p>
          <p className="text-xs text-muted-foreground">
            MP4 format, max 500MB per video
          </p>
        </div>
      )}

      {/* Video Preview List */}
      {videos.length > 0 && (
        <div className="space-y-3">
          {videos.map((video) => (
            <div
              key={video.id}
              className="relative border rounded-lg p-4 bg-muted/50"
            >
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-lg bg-background border flex items-center justify-center">
                    <Video className="h-8 w-8 text-muted-foreground" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{video.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(video.file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                  {video.uploadStatus && (
                    <div className="mt-2 flex items-center gap-2">
                      {video.uploadStatus === "uploading" ||
                      video.uploadStatus === "processing" ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      ) : video.uploadStatus === "ready" ? (
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                      ) : video.uploadStatus === "error" ? (
                        <div className="h-2 w-2 rounded-full bg-red-500" />
                      ) : null}
                      <span className="text-xs text-muted-foreground">
                        {getStatusText(video.uploadStatus)}
                      </span>
                      {video.uploadProgress !== undefined &&
                        video.uploadStatus === "uploading" && (
                          <span className="text-xs text-muted-foreground">
                            {video.uploadProgress}%
                          </span>
                        )}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeVideo(video.id)}
                  disabled={disabled || video.uploadStatus === "uploading"}
                  className="flex-shrink-0 h-8 w-8 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {videos.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {videos.length} of {maxVideos} video(s) selected
        </p>
      )}
    </div>
  )
}

