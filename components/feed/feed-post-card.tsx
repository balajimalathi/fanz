"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Lock, LogIn, Pin, MoreVertical, Flag, Bell, IndianRupee, EyeOff, BarChart3 } from "lucide-react"
import toast from "react-hot-toast"
import { Card, CardContent } from "@/components/ui/card"
import { PostMediaDisplay } from "@/components/post/post-media-display"
import { LikeButton } from "@/components/feed/like-button"
import { CommentsSection } from "@/components/feed/comments-section"
import { ExclusivePostOverlay } from "@/components/payments/exclusive-post-overlay"
import { Button } from "@/components/ui/button"
import { ReportContentDialog } from "@/components/report/report-content-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatPostDate } from "@/lib/utils/feed"
import { PriceDisplay } from "../currency/price-display"
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar"
import { Badge } from "../ui/badge"
import { PostNotifyModal } from "@/components/feed/post-notify-modal"
import { PostEditPriceModal } from "@/components/feed/post-edit-price-modal"
import { PostAnalyticsModal } from "@/components/feed/post-analytics-modal"

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
  postType: "subscription" | "exclusive" | "free"
  price: number | null
  priceCurrency?: string // ISO 4217 currency code
  isPinned: boolean
  isHidden?: boolean
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
  onPinChange?: (postId: string, isPinned: boolean) => void
  onHideChange?: (postId: string, isHidden: boolean) => void
  onPriceChange?: (postId: string, price: number | null) => void
}

export function FeedPostCard({
  post,
  currentUserId,
  onLikeChange,
  onCommentCountChange,
  onPinChange,
  onHideChange,
  onPriceChange,
}: FeedPostCardProps) {
  const [commentCount, setCommentCount] = useState(post.commentCount)
  const [showReportDialog, setShowReportDialog] = useState(false)
  const [notifyOpen, setNotifyOpen] = useState(false)
  const [editPriceOpen, setEditPriceOpen] = useState(false)
  const [analyticsOpen, setAnalyticsOpen] = useState(false)
  const [isPinning, setIsPinning] = useState(false)
  const [isHiding, setIsHiding] = useState(false)
  const pathname = usePathname()

  const isCreator = currentUserId != null && currentUserId === post.creator?.id
  const canReport = currentUserId && currentUserId !== post.creator?.id

  const handlePin = async () => {
    if (isPinning) return
    setIsPinning(true)
    try {
      const response = await fetch(`/api/posts/${post.id}/pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned: !post.isPinned }),
      })
      if (!response.ok) throw new Error("Failed to pin post")
      toast.success(post.isPinned ? "Post unpinned" : "Post pinned")
      onPinChange?.(post.id, !post.isPinned)
    } catch (error) {
      console.error("Error pinning post:", error)
      toast.error("Failed to pin post")
    } finally {
      setIsPinning(false)
    }
  }

  const handleHide = async () => {
    if (isHiding) return
    setIsHiding(true)
    try {
      const response = await fetch(`/api/posts/${post.id}/hide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isHidden: !post.isHidden }),
      })
      if (!response.ok) throw new Error("Failed to update post visibility")
      toast.success(post.isHidden ? "Post is now visible" : "Post hidden")
      onHideChange?.(post.id, !post.isHidden)
    } catch (error) {
      console.error("Error hiding post:", error)
      toast.error("Failed to update post visibility")
    } finally {
      setIsHiding(false)
    }
  }

  const creatorLink = post.creator?.username
    ? `/u/${post.creator.username}`
    : `/u/${post.creator?.id}`

  return (
    <Card className="w-full">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 pb-2">
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
              {post.isHidden && (
                <Badge variant="secondary" className="gap-1">
                  <EyeOff className="h-3 w-3" />
                  Hidden
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatPostDate(post.createdAt)}
            </p>
          </div>
          {post.postType === "exclusive" && post.price && (
            <Badge variant="outline">
              <PriceDisplay
                amount={post.price}
                currency={post.priceCurrency}
              />
            </Badge>
          )}
          {isCreator && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">More options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={handlePin} disabled={isPinning}>
                  <Pin className="mr-2 h-4 w-4" />
                  {post.isPinned ? "Unpin" : "Pin"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setNotifyOpen(true)}>
                  <Bell className="mr-2 h-4 w-4" />
                  Notify
                </DropdownMenuItem>
                {post.postType === "exclusive" && (
                  <DropdownMenuItem onClick={() => setEditPriceOpen(true)}>
                    <IndianRupee className="mr-2 h-4 w-4" />
                    Edit price
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleHide} disabled={isHiding}>
                  <EyeOff className="mr-2 h-4 w-4" />
                  {post.isHidden ? "Unhide post" : "Hide post"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setAnalyticsOpen(true)}>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  See Analytics
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Media */}
        <div className="w-full relative">
          {post.media.length > 0 ? (
            <>
              <PostMediaDisplay
                media={post.media}
                postId={post.id}
                userId={currentUserId}
                hasAccess={post.hasAccess}
              />
              {!post.hasAccess && post.postType === "exclusive" && post.price && (
                <ExclusivePostOverlay
                  postId={post.id}
                  price={post.price}
                  currency={post.priceCurrency}
                  caption={post.caption}
                  onPurchaseComplete={() => {
                    // Reload page to show unlocked content
                    window.location.reload()
                  }}
                />
              )}
              {!post.hasAccess && post.postType === "subscription" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10 pointer-events-none">
                  <div className="flex flex-col items-center gap-2 text-white">
                    <Lock className="h-8 w-8" />
                    <p className="text-sm font-medium">Membership Required</p>
                  </div>
                </div>
              )}
              {!post.hasAccess && post.postType === "free" && !currentUserId && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                  <div className="flex flex-col items-center gap-4 text-white px-4">
                    <LogIn className="h-10 w-10" />
                    <p className="text-base font-semibold">Sign in to view</p>
                    <p className="text-sm text-white/80 text-center">
                      This is free content available to all logged-in users
                    </p>
                    <Button asChild className="mt-2">
                      <Link href={`/login?redirect=${encodeURIComponent(pathname || "/")}`}>
                        Sign In
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </>
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
          <div className="flex gap-4 items-center justify-between">
            <div className="flex gap-4">
              <LikeButton
                postId={post.id}
                initialLiked={post.isLiked}
                initialCount={post.likeCount}
                disabled={!post.hasAccess}
                onLikeChange={(liked, count) => {
                  onLikeChange?.(post.id, liked, count)
                }}
              />
              <CommentsSection
                postId={post.id}
                initialCount={commentCount}
                currentUserId={currentUserId}
                disabled={!post.hasAccess}
                onCountChange={(count) => {
                  setCommentCount(count)
                  onCommentCountChange?.(post.id, count)
                }}
              />
            </div>
            {canReport && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">More options</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowReportDialog(true)}>
                    <Flag className="mr-2 h-4 w-4" />
                    Report
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardContent>
      {canReport && (
        <ReportContentDialog
          open={showReportDialog}
          onOpenChange={setShowReportDialog}
          postId={post.id}
          creatorId={post.creator?.id}
        />
      )}
      {isCreator && post.creator?.id && (
        <>
          <PostNotifyModal
            open={notifyOpen}
            onOpenChange={setNotifyOpen}
            postId={post.id}
            creatorId={post.creator.id}
          />
          <PostEditPriceModal
            open={editPriceOpen}
            onOpenChange={setEditPriceOpen}
            postId={post.id}
            currentPrice={post.price}
            currency={post.priceCurrency}
            onSuccess={(newPrice: number | null) => onPriceChange?.(post.id, newPrice)}
          />
          <PostAnalyticsModal
            open={analyticsOpen}
            onOpenChange={setAnalyticsOpen}
            postId={post.id}
          />
        </>
      )}
    </Card>
  )
}

