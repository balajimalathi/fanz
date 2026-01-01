"use client"

import { useState } from "react"
import { Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface LikeButtonProps {
  postId: string
  initialLiked: boolean
  initialCount: number
  disabled?: boolean
  onLikeChange?: (liked: boolean, count: number) => void
}

export function LikeButton({
  postId,
  initialLiked,
  initialCount,
  disabled = false,
  onLikeChange,
}: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)
  const [isLoading, setIsLoading] = useState(false)

  const handleLike = async () => {
    if (isLoading || disabled) return

    // Optimistic update
    const newLiked = !liked
    const newCount = newLiked ? count + 1 : count - 1
    setLiked(newLiked)
    setCount(newCount)
    setIsLoading(true)

    try {
      const method = newLiked ? "POST" : "DELETE"
      const response = await fetch(`/api/posts/${postId}/like`, {
        method,
      })

      if (!response.ok) {
        throw new Error("Failed to update like")
      }

      const data = await response.json()
      setCount(data.likeCount)
      setLiked(data.liked)
      onLikeChange?.(data.liked, data.likeCount)
    } catch (error) {
      // Revert on error
      setLiked(!newLiked)
      setCount(count)
      console.error("Error updating like:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleLike}
      disabled={isLoading || disabled}
      className={cn(
        "flex items-center gap-2",
        liked && "text-red-500 hover:text-red-600",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <Heart
        className={cn(
          "h-5 w-5 transition-all",
          liked && "fill-current"
        )}
      />
      <span className="text-sm">{count}</span>
    </Button>
  )
}

