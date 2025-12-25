"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Loader2 } from "lucide-react"
import { FeedPostCard } from "@/components/feed/feed-post-card"

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

interface FeedSectionProps {
  username: string
}

export function FeedSection({ username }: FeedSectionProps) {
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
  const fetchPosts = useCallback(
    async (cursor: string | null = null) => {
      try {
        if (cursor === null) {
          setIsLoading(true)
        } else {
          setIsLoadingMore(true)
        }
        setError(null)

        const url = cursor
          ? `/api/posts/creator/${username}?cursor=${cursor}&limit=10`
          : `/api/posts/creator/${username}?limit=10`

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
    },
    [username]
  )

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
      prev.map((post) => (post.id === postId ? { ...post, commentCount: count } : post))
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading posts...</p>
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

  if (posts.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-muted-foreground text-sm">No posts yet.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">Posts</h2>
        <p className="text-muted-foreground text-sm sm:text-base">
          Latest posts from this creator
        </p>
      </div>

      <div className="flex justify-center">
        <div className="max-w-2xl w-full space-y-6">
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
    </div>
  )
}

