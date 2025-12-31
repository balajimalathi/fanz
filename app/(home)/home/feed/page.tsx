"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Loader2, RefreshCw, Users } from "lucide-react"
import { FeedPostCard } from "@/components/feed/feed-post-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

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

interface Creator {
  id: string
  username: string | null
  displayName: string
  profileImageUrl: string | null
}

interface FeedPost {
  id: string
  creator: Creator | null
  caption: string | null
  postType: "subscription" | "exclusive"
  price: number | null
  isPinned: boolean
  media: PostMedia[]
  likeCount: number
  commentCount: number
  isLiked: boolean
  hasAccess: boolean
  createdAt: string
}

interface FeedResponse {
  posts: FeedPost[]
  nextCursor: string | null
  hasMore: boolean
}

export default function FeedPage() {
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const observerTarget = useRef<HTMLDivElement>(null)

  // Fetch current user ID
  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const response = await fetch("/api/auth/session")
        if (response.ok) {
          const data = await response.json()
          setCurrentUserId(data?.user?.id || null)
        }
      } catch (error) {
        console.error("Error fetching user ID:", error)
      }
    }
    fetchUserId()
  }, [])

  // Fetch posts
  const fetchPosts = useCallback(async (cursor: string | null = null) => {
    try {
      if (cursor === null) {
        setIsLoading(true)
      } else {
        setIsLoadingMore(true)
      }
      setError(null)

      const url = cursor
        ? `/api/posts/feed?cursor=${cursor}&limit=10`
        : `/api/posts/feed?limit=10`

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error("Failed to fetch posts")
      }

      const data: FeedResponse = await response.json()

      if (cursor === null) {
        setPosts(data.posts)
      } else {
        setPosts((prev) => [...prev, ...data.posts])
      }

      setNextCursor(data.nextCursor)
      setHasMore(data.hasMore)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      console.error("Error fetching feed:", err)
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    fetchPosts(null)
  }, [fetchPosts])

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !isLoadingMore && !isLoading) {
          if (nextCursor) {
            fetchPosts(nextCursor)
          }
        }
      },
      { threshold: 0.1 }
    )

    const currentTarget = observerTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [hasMore, isLoadingMore, isLoading, nextCursor, fetchPosts])

  const handleLikeChange = (postId: string, liked: boolean, count: number) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? { ...post, isLiked: liked, likeCount: count }
          : post
      )
    )
  }

  const handleCommentCountChange = (postId: string, count: number) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId ? { ...post, commentCount: count } : post
      )
    )
  }

  const handleRetry = () => {
    fetchPosts(null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading feed...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center space-y-4">
            <p className="text-destructive">{error}</p>
            <Button onClick={handleRetry} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center space-y-4">
            <Users className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
              <p className="text-sm text-muted-foreground">
                You haven&apos;t created any posts yet. Start creating content to see it here!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex justify-center pb-20 p-4 md:pb-4 lg:pb-4">
      <div className="max-w-2xl w-full space-y-6 pb-8">
      {posts.map((post) => (
        <FeedPostCard
          key={post.id}
          post={post}
          currentUserId={currentUserId}
          onLikeChange={handleLikeChange}
          onCommentCountChange={handleCommentCountChange}
        />
      ))}

      {/* Infinite scroll trigger */}
      {hasMore && (
        <div ref={observerTarget} className="flex justify-center py-8">
          {isLoadingMore && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading more posts...</span>
            </div>
          )}
        </div>
      )}

      {!hasMore && posts.length > 0 && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          You&apos;re all caught up! No more posts to show.
        </div>
      )}
      </div>
    </div>
  )
}

