"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Pin, Lock } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { PostMediaDisplay } from "@/components/post/post-media-display"
import { LikeButton } from "@/components/feed/like-button"
import { CommentsSection } from "@/components/feed/comments-section"
import { formatPostDate } from "@/lib/utils/feed"
import { cn } from "@/lib/utils"

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

interface FeedPostCardProps {
  post: FeedPost
  currentUserId: string | null
  onLikeChange?: (postId: string, liked: boolean, count: number) => void
  onCommentCountChange?: (postId: string, count: number) => void
}

export function FeedPostCard({
  post,
  currentUserId,
  onLikeChange,
  onCommentCountChange,
}: FeedPostCardProps) {
  const [commentCount, setCommentCount] = useState(post.commentCount)

  const creatorLink = post.creator?.username
    ? `/u/${post.creator.username}`
    : `/u/${post.creator?.id}`

  return (
    <Card className="w-full">
      <CardContent className="p-0">
        {/* Header */}
        {/* <div className="flex items-center gap-3 p-4 pb-2">
          <Link href={creatorLink}>
            <Avatar className="h-10 w-10 cursor-pointer hover:opacity-80 transition-opacity">
              <AvatarImage
                src={post.creator?.profileImageUrl || undefined}
                alt={post.creator?.displayName || "Creator"}
              />
              <AvatarFallback>
                {post.creator?.displayName?.charAt(0).toUpperCase() || "C"}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Link
                href={creatorLink}
                className="font-semibold hover:underline truncate"
              >
                {post.creator?.displayName || "Unknown Creator"}
              </Link>
              {post.isPinned && (
                <Badge variant="secondary" className="gap-1">
                  <Pin className="h-3 w-3" />
                  Pinned
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatPostDate(post.createdAt)}
            </p>
          </div>
          {post.postType === "exclusive" && post.price && (
            <Badge variant="outline">
              ₹{post.price.toFixed(2)}
            </Badge>
          )}
        </div> */}
 
        {/* Media */}
        <div className="w-full">
          {post.media.length > 0 ? (
            <PostMediaDisplay
              media={post.media}
              postId={post.id}
              userId={currentUserId}
              onSubscribe={() => {
                // Navigate to subscription page or show modal
                window.location.href = creatorLink
              }}
            />
          ) : (
            <div className="aspect-video bg-muted flex items-center justify-center">
              <p className="text-muted-foreground text-sm">No media</p>
            </div>
          )}
        </div>
        {/* Caption */}
        {post.caption && (
          <div className="p-4">
            <p className="text-sm whitespace-pre-wrap">{post.caption}</p>
          </div>
        )}
        {/* Actions */}
        <div className="px-4 py-3 space-y-3 border-t">
          <div className="flex gap-4">
            <LikeButton
              postId={post.id}
              initialLiked={post.isLiked}
              initialCount={post.likeCount}
              onLikeChange={(liked, count) => {
                onLikeChange?.(post.id, liked, count)
              }}
            />
            <CommentsSection
              postId={post.id}
              initialCount={commentCount}
              currentUserId={currentUserId}
              onCountChange={(count) => {
                setCommentCount(count)
                onCommentCountChange?.(post.id, count)
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

