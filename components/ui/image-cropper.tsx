"use client"

import { useState, useCallback, useEffect } from "react"
import Cropper from "react-easy-crop"
import { Button } from "@/components/ui/button"
import { getCroppedImg } from "@/lib/utils/image-processing"
import type { Area } from "react-easy-crop"
import toast from "react-hot-toast"

interface ImageCropperProps {
  image: File | string
  aspectRatio: number
  targetWidth: number
  targetHeight: number
  onCropComplete: (blob: Blob) => void
  onCancel: () => void
}

export function ImageCropper({
  image,
  aspectRatio,
  targetWidth,
  targetHeight,
  onCropComplete,
  onCancel,
}: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [imageSrc, setImageSrc] = useState<string>("")

  // Load image on mount or when image prop changes
  useEffect(() => {
    if (typeof image === "string") {
      setImageSrc(image)
    } else {
      const reader = new FileReader()
      reader.onload = () => {
        setImageSrc(reader.result as string)
      }
      reader.readAsDataURL(image)
    }
  }, [image])

  const onCropChange = useCallback((crop: { x: number; y: number }) => {
    setCrop(crop)
  }, [])

  const onZoomChange = useCallback((zoom: number) => {
    setZoom(zoom)
  }, [])

  const onCropCompleteCallback = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels)
    },
    []
  )

  const handleCrop = async () => {
    if (!croppedAreaPixels || !imageSrc) return

    setIsProcessing(true)
    try {
      const croppedBlob = await getCroppedImg(
        imageSrc,
        croppedAreaPixels,
        targetWidth,
        targetHeight
      )
      onCropComplete(croppedBlob)
    } catch (error) {
      console.error("Error cropping image:", error)
      toast.error("Failed to crop image. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  if (!imageSrc) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading image...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative w-full h-[400px] bg-black rounded-lg overflow-hidden">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={aspectRatio}
          onCropChange={onCropChange}
          onZoomChange={onZoomChange}
          onCropComplete={onCropCompleteCallback}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium min-w-[60px]">Zoom:</label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1"
          />
          <span className="text-sm text-muted-foreground w-12 text-right">
            {zoom.toFixed(1)}x
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Target size: {targetWidth} × {targetHeight}px
        </p>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel} disabled={isProcessing}>
          Cancel
        </Button>
        <Button onClick={handleCrop} disabled={isProcessing || !croppedAreaPixels}>
          {isProcessing ? "Processing..." : "Crop & Save"}
        </Button>
      </div>
    </div>
  )
}

