"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { UserPlus, UserMinus, Loader2 } from "lucide-react"
import { LoginModal } from "./login-modal"
import { toast } from "sonner"
import { useSession } from "@/lib/auth/auth-client"

interface FollowButtonProps {
  creatorId: string
  className?: string
}

export function FollowButton({ creatorId, className }: FollowButtonProps) {
  const { data: session } = useSession()
  const [isFollowing, setIsFollowing] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [pendingFollow, setPendingFollow] = useState(false)
  const prevAuthenticatedRef = useRef(false)
  const isAuthenticated = !!session?.user

  // Check authentication status and follow status on mount and when creatorId changes
  useEffect(() => {
    const checkStatus = async () => {
      try {
        // Fetch follow status and count
        const followResponse = await fetch(`/api/follow/${creatorId}`)
        if (followResponse.ok) {
          const text = await followResponse.text()
          if (text) {
            try {
              const data = JSON.parse(text)
              setIsFollowing(data.following)
              setFollowerCount(data.followerCount)
            } catch (parseError) {
              console.error("Error parsing follow status:", parseError)
            }
          }
        }
      } catch (error) {
        console.error("Error checking follow status:", error)
      } finally {
        setIsLoading(false)
      }
    }

    checkStatus()
  }, [creatorId])

  // Handle pending follow when user logs in
  useEffect(() => {
    const wasAuthenticated = prevAuthenticatedRef.current
    const nowAuthenticated = isAuthenticated
    prevAuthenticatedRef.current = nowAuthenticated

    // If user just logged in and there's a pending follow, execute it
    if (!wasAuthenticated && nowAuthenticated && pendingFollow) {
      setPendingFollow(false)
      // Small delay to ensure session is fully established
      setTimeout(async () => {
        setIsUpdating(true)
        try {
          const response = await fetch(`/api/follow/${creatorId}`, {
            method: "POST",
          })

          if (!response.ok) {
            const errorText = await response.text()
            let errorMessage = "Failed to follow creator"
            try {
              const errorData = errorText ? JSON.parse(errorText) : {}
              errorMessage = errorData.error || errorMessage
            } catch {
              // Use default error message if parsing fails
            }
            throw new Error(errorMessage)
          }

          const text = await response.text()
          if (!text) {
            throw new Error("Empty response from server")
          }

          const data = JSON.parse(text)
          setIsFollowing(data.following)
          setFollowerCount(data.followerCount)
          
          toast.success("You are now following this creator")
        } catch (error) {
          console.error("Error following creator:", error)
          toast.error(error instanceof Error ? error.message : "Failed to follow creator")
        } finally {
          setIsUpdating(false)
        }
      }, 500)
    }
  }, [isAuthenticated, pendingFollow, creatorId])

  const handleFollowAction = async () => {
    setIsUpdating(true)
    try {
      // Get current follow status before making the request
      const currentFollowing = isFollowing
      const method = currentFollowing ? "DELETE" : "POST"
      const response = await fetch(`/api/follow/${creatorId}`, {
        method,
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = "Failed to update follow status"
        try {
          const errorData = errorText ? JSON.parse(errorText) : {}
          errorMessage = errorData.error || errorMessage
        } catch {
          // Use default error message if parsing fails
        }
        throw new Error(errorMessage)
      }

      const text = await response.text()
      if (!text) {
        throw new Error("Empty response from server")
      }

      const data = JSON.parse(text)
      setIsFollowing(data.following)
      setFollowerCount(data.followerCount)
      
      toast.success(
        data.following ? "You are now following this creator" : "You unfollowed this creator"
      )
    } catch (error) {
      console.error("Error updating follow status:", error)
      toast.error(error instanceof Error ? error.message : "Failed to update follow status")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleFollow = async () => {
    if (!isAuthenticated) {
      setPendingFollow(true)
      setShowLoginModal(true)
      return
    }

    await handleFollowAction()
  }

  if (isLoading) {
    return (
      <Button disabled className={className}>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading...
      </Button>
    )
  }

  return (
    <>
      <Button
        onClick={handleFollow}
        disabled={isUpdating}
        variant={isFollowing ? "outline" : "default"}
        className={className}
      >
        {isUpdating ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : isFollowing ? (
          <UserMinus className="mr-2 h-4 w-4" />
        ) : (
          <UserPlus className="mr-2 h-4 w-4" />
        )}
        {isFollowing ? "Unfollow" : "Follow"}
        {followerCount > 0 && (
          <span className="ml-2 text-xs opacity-70">
            ({followerCount})
          </span>
        )}
      </Button>
      <LoginModal 
        open={showLoginModal} 
        onOpenChange={(open) => {
          setShowLoginModal(open)
          // If modal closes and user didn't log in, clear pending follow
          if (!open && !isAuthenticated && pendingFollow) {
            // Wait a bit to see if session updates, then clear if still not authenticated
            setTimeout(() => {
              if (!session?.user) {
                setPendingFollow(false)
              }
            }, 2000)
          }
        }} 
      />
    </>
  )
}

