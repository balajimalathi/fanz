"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ImageCarouselProps {
  images: Array<{
    id: string
    url: string
    blurThumbnailUrl?: string | null
  }>
  height?: string
}

export function ImageCarousel({ images, height = "600px" }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  if (images.length === 0) return null

  const currentImage = images[currentIndex]
  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length)
  }

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  const openLightbox = (index: number) => {
    setLightboxIndex(index)
    setIsLightboxOpen(true)
  }

  const closeLightbox = () => {
    setIsLightboxOpen(false)
  }

  const lightboxNext = () => {
    setLightboxIndex((prev) => (prev + 1) % images.length)
  }

  const lightboxPrev = () => {
    setLightboxIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  // Handle keyboard navigation in lightbox
  useEffect(() => {
    if (!isLightboxOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        setLightboxIndex((prev) => (prev - 1 + images.length) % images.length)
      }
      if (e.key === "ArrowRight") {
        setLightboxIndex((prev) => (prev + 1) % images.length)
      }
      if (e.key === "Escape") {
        closeLightbox()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isLightboxOpen, images.length, closeLightbox])

  return (
    <>
      {/* Carousel */}
      <div
        className="relative w-full overflow-hidden rounded-lg bg-muted"
        style={{ height }}
      >
        {/* Background blur image */}
        {currentImage.blurThumbnailUrl && (
          <div className="absolute inset-0">
            <Image
              src={currentImage.blurThumbnailUrl}
              alt="Background"
              fill
              className="object-cover blur-2xl scale-110 opacity-30"
              unoptimized
            />
          </div>
        )}

        {/* Main image container */}
        <div className="relative w-full h-full flex items-center justify-center">
          {images.map((image, index) => (
            <div
              key={image.id}
              className={cn(
                "absolute inset-0 transition-opacity duration-300 cursor-pointer",
                index === currentIndex ? "opacity-100 z-10" : "opacity-0 z-0"
              )}
              onClick={() => openLightbox(index)}
            >
              <Image
                src={image.url}
                alt={`Image ${index + 1}`}
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          ))}
        </div>

        {/* Navigation arrows */}
        {images.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 bg-black/50 hover:bg-black/70 text-white"
              onClick={(e) => {
                e.stopPropagation()
                prevImage()
              }}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 bg-black/50 hover:bg-black/70 text-white"
              onClick={(e) => {
                e.stopPropagation()
                nextImage()
              }}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </>
        )}

        {/* Dots indicator */}
        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {images.map((_, index) => (
              <button
                key={index}
                className={cn(
                  "h-2 rounded-full transition-all",
                  index === currentIndex
                    ? "w-8 bg-white"
                    : "w-2 bg-white/50 hover:bg-white/75"
                )}
                onClick={(e) => {
                  e.stopPropagation()
                  setCurrentIndex(index)
                }}
                aria-label={`Go to image ${index + 1}`}
              />
            ))}
          </div>
        )}

        {/* Image counter */}
        {images.length > 1 && (
          <div className="absolute top-4 right-4 z-20 bg-black/50 text-white px-2 py-1 rounded text-sm">
            {currentIndex + 1} / {images.length}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={closeLightbox}
          role="dialog"
          aria-modal="true"
          aria-label="Image lightbox"
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

          {/* Lightbox image */}
          <div
            className="relative w-full h-full flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={images[lightboxIndex].url}
              alt={`Image ${lightboxIndex + 1}`}
              width={1920}
              height={1080}
              className="max-w-full max-h-full object-contain"
              unoptimized
            />
          </div>

          {/* Lightbox navigation */}
          {images.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation()
                  lightboxPrev()
                }}
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation()
                  lightboxNext()
                }}
              >
                <ChevronRight className="h-8 w-8" />
              </Button>

              {/* Lightbox dots */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex gap-2">
                {images.map((_, index) => (
                  <button
                    key={index}
                    className={cn(
                      "h-2 rounded-full transition-all",
                      index === lightboxIndex
                        ? "w-8 bg-white"
                        : "w-2 bg-white/50 hover:bg-white/75"
                    )}
                    onClick={(e) => {
                      e.stopPropagation()
                      setLightboxIndex(index)
                    }}
                    aria-label={`Go to image ${index + 1}`}
                  />
                ))}
              </div>

              {/* Lightbox counter */}
              <div className="absolute top-4 left-4 z-50 bg-black/50 text-white px-3 py-1 rounded text-sm">
                {lightboxIndex + 1} / {images.length}
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}

