"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Pin,
  Bell,
  Link2,
  Send,
  Loader2,
  Check,
  Copy,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { ImageUpload } from "@/components/post/image-upload"
import { VideoUpload } from "@/components/post/video-upload"
import { FollowerSelector } from "@/components/post/follower-selector"
import { cn } from "@/lib/utils"

interface Membership {
  id: string
  title: string
  description: string
  monthlyRecurringFee: number
}

interface ImageFile {
  file: File
  preview: string
  id: string
}

interface VideoFile {
  file: File
  preview: string | null
  id: string
  uploadStatus?: "pending" | "uploading" | "processing" | "ready" | "error"
  uploadProgress?: number
}

export default function CreatePostPage() {
  const router = useRouter()
  const [caption, setCaption] = useState("")
  const [postType, setPostType] = useState<"subscription" | "exclusive">("subscription")
  const [selectedMemberships, setSelectedMemberships] = useState<Set<string>>(new Set())
  const [price, setPrice] = useState("")
  const [images, setImages] = useState<ImageFile[]>([])
  const [videos, setVideos] = useState<VideoFile[]>([])
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishedPostId, setPublishedPostId] = useState<string | null>(null)
  const [isPinned, setIsPinned] = useState(false)
  const [postLink, setPostLink] = useState<string | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const [followerSelectorOpen, setFollowerSelectorOpen] = useState(false)
  const [creatorId, setCreatorId] = useState<string | null>(null)

  useEffect(() => {
    fetchMemberships()
    fetchCreatorId()
  }, [])

  const fetchMemberships = async () => {
    try {
      const response = await fetch("/api/memberships")
      if (!response.ok) throw new Error("Failed to fetch memberships")
      const data = await response.json()
      setMemberships(data)
    } catch (error) {
      console.error("Error fetching memberships:", error)
    }
  }

  const fetchCreatorId = async () => {
    // We'll get the creator ID from the session when needed
    // For now, we can fetch it from the auth session
    try {
      const response = await fetch("/api/auth/session")
      if (response.ok) {
        const data = await response.json()
        if (data?.user?.id) {
          setCreatorId(data.user.id)
        }
      }
    } catch (error) {
      console.error("Error fetching creator ID:", error)
    }
  }

  const toggleMembership = (membershipId: string) => {
    const newSelected = new Set(selectedMemberships)
    if (newSelected.has(membershipId)) {
      newSelected.delete(membershipId)
    } else {
      newSelected.add(membershipId)
    }
    setSelectedMemberships(newSelected)
  }

  const handlePublish = async () => {
    if (postType === "subscription" && selectedMemberships.size === 0) {
      alert("Please select at least one membership for subscription posts")
      return
    }

    if (postType === "exclusive" && (!price || parseFloat(price) <= 0)) {
      alert("Please enter a valid price for exclusive posts")
      return
    }

    setIsPublishing(true)

    try {
      // Create post
      const postData: any = {
        caption: caption || undefined,
        postType,
      }

      if (postType === "subscription") {
        postData.membershipIds = Array.from(selectedMemberships)
      } else {
        postData.price = parseFloat(price)
      }

      const postResponse = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData),
      })

      if (!postResponse.ok) {
        const error = await postResponse.json()
        throw new Error(error.error || "Failed to create post")
      }

      const post = await postResponse.json()
      const postId = post.id
      setPublishedPostId(postId)

      // Upload images if any
      if (images.length > 0) {
        const formData = new FormData()
        images.forEach((image) => {
          formData.append("files", image.file)
        })

        const mediaResponse = await fetch(`/api/posts/${postId}/media`, {
          method: "POST",
          body: formData,
        })

        if (!mediaResponse.ok) {
          throw new Error("Failed to upload images")
        }
      }

      // Upload videos if any
      if (videos.length > 0) {
        for (const video of videos) {
          // Update video status to uploading
          setVideos((prev) =>
            prev.map((v) =>
              v.id === video.id
                ? { ...v, uploadStatus: "uploading", uploadProgress: 0 }
                : v
            )
          )

          try {
            const formData = new FormData()
            formData.append("file", video.file)

            const videoResponse = await fetch(`/api/posts/${postId}/video`, {
              method: "POST",
              body: formData,
            })

            if (!videoResponse.ok) {
              throw new Error("Failed to upload video")
            }

            const videoData = await videoResponse.json()

            // Update video status to processing
            setVideos((prev) =>
              prev.map((v) =>
                v.id === video.id
                  ? { ...v, uploadStatus: "processing", uploadProgress: 100 }
                  : v
              )
            )

            // Poll for processing status (optional - you can implement webhook instead)
            // For now, we'll just mark it as processing
          } catch (error) {
            setVideos((prev) =>
              prev.map((v) =>
                v.id === video.id ? { ...v, uploadStatus: "error" } : v
              )
            )
            console.error("Error uploading video:", error)
          }
        }
      }

      // Get post link
      const linkResponse = await fetch(`/api/posts/${postId}/link`)
      if (linkResponse.ok) {
        const linkData = await linkResponse.json()
        setPostLink(linkData.link)
      }

      alert("Post published successfully!")
    } catch (error) {
      console.error("Error publishing post:", error)
      alert(error instanceof Error ? error.message : "Failed to publish post")
    } finally {
      setIsPublishing(false)
    }
  }

  const handlePin = async () => {
    if (!publishedPostId) return

    try {
      const response = await fetch(`/api/posts/${publishedPostId}/pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned: !isPinned }),
      })

      if (!response.ok) throw new Error("Failed to pin post")

      setIsPinned(!isPinned)
      alert(isPinned ? "Post unpinned" : "Post pinned")
    } catch (error) {
      console.error("Error pinning post:", error)
      alert("Failed to pin post")
    }
  }

  const handleNotify = async () => {
    if (!publishedPostId) return

    try {
      const response = await fetch(`/api/posts/${publishedPostId}/notify`, {
        method: "POST",
      })

      if (!response.ok) throw new Error("Failed to send notifications")

      const data = await response.json()
      alert(`Notifications sent to ${data.notificationsCreated} followers`)
    } catch (error) {
      console.error("Error sending notifications:", error)
      alert("Failed to send notifications")
    }
  }

  const handleCopyLink = async () => {
    if (!postLink) return

    try {
      await navigator.clipboard.writeText(postLink)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch (error) {
      console.error("Error copying link:", error)
      alert("Failed to copy link")
    }
  }

  const handleBroadcast = (followerIds: string[]) => {
    if (!publishedPostId) return

    fetch(`/api/posts/${publishedPostId}/broadcast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ followerIds }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          alert(`Post broadcasted to ${data.notificationsCreated} followers`)
        } else {
          alert("Failed to broadcast post")
        }
      })
      .catch((error) => {
        console.error("Error broadcasting post:", error)
        alert("Failed to broadcast post")
      })
  }

  const captionLength = caption.length
  const maxCaptionLength = 5000

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Create New Post</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Image Upload */}
          <div>
            <Label className="mb-2 block">Images</Label>
            <ImageUpload
              images={images}
              onImagesChange={setImages}
              maxImages={10}
              disabled={isPublishing || !!publishedPostId}
            />
          </div>

          {/* Video Upload */}
          <div>
            <Label className="mb-2 block">Videos</Label>
            <VideoUpload
              videos={videos}
              onVideosChange={setVideos}
              maxVideos={1}
              disabled={isPublishing || !!publishedPostId}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Videos will be processed after upload. This may take a few minutes.
            </p>
          </div>

          {/* Caption */}
          <div>
            <Label htmlFor="caption">Caption</Label>
            <Textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption for your post..."
              className="mt-2 min-h-[120px]"
              maxLength={maxCaptionLength}
              disabled={isPublishing || !!publishedPostId}
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">
              {captionLength} / {maxCaptionLength}
            </p>
          </div>

          {/* Post Type */}
          <div>
            <Label className="mb-3 block">Post Type</Label>
            <RadioGroup
              value={postType}
              onValueChange={(value) => setPostType(value as "subscription" | "exclusive")}
              disabled={isPublishing || !!publishedPostId}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="subscription" id="subscription" />
                <Label htmlFor="subscription" className="cursor-pointer">
                  Subscription (visible to selected membership plans)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="exclusive" id="exclusive" />
                <Label htmlFor="exclusive" className="cursor-pointer">
                  Exclusive (one-time payment)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Conditional Fields */}
          {postType === "subscription" && (
            <div>
              <Label className="mb-3 block">Select Memberships</Label>
              {memberships.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No memberships available. Create a membership first.
                </p>
              ) : (
                <div className="space-y-2">
                  {memberships.map((membership) => {
                    const isSelected = selectedMemberships.has(membership.id)
                    return (
                      <button
                        key={membership.id}
                        type="button"
                        onClick={() => toggleMembership(membership.id)}
                        disabled={isPublishing || !!publishedPostId}
                        className={cn(
                          "w-full text-left p-3 rounded-lg border transition-colors",
                          isSelected
                            ? "border-primary bg-primary/10"
                            : "border-border hover:bg-accent"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{membership.title}</p>
                            <p className="text-sm text-muted-foreground">
                              Rs. {membership.monthlyRecurringFee}/month
                            </p>
                          </div>
                          {isSelected && (
                            <Check className="h-5 w-5 text-primary" />
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
              {selectedMemberships.size > 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  {selectedMemberships.size} membership(s) selected
                </p>
              )}
            </div>
          )}

          {postType === "exclusive" && (
            <div>
              <Label htmlFor="price">Price (Rs.)</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="mt-2"
                disabled={isPublishing || !!publishedPostId}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Price in Indian Rupees
              </p>
            </div>
          )}

          {/* Publish Button */}
          {!publishedPostId ? (
            <Button
              onClick={handlePublish}
              disabled={isPublishing || (images.length === 0 && videos.length === 0)}
              className="w-full"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                "Publish Post"
              )}
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                <p className="text-sm text-green-800 dark:text-green-200">
                  Post published successfully!
                </p>
              </div>

              {/* Post Actions */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Button
                  variant={isPinned ? "default" : "outline"}
                  onClick={handlePin}
                  className="w-full"
                >
                  <Pin className="mr-2 h-4 w-4" />
                  {isPinned ? "Pinned" : "Pin"}
                </Button>

                <Button variant="outline" onClick={handleNotify} className="w-full">
                  <Bell className="mr-2 h-4 w-4" />
                  Notify
                </Button>

                <Button
                  variant="outline"
                  onClick={handleCopyLink}
                  className="w-full"
                >
                  {linkCopied ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Link2 className="mr-2 h-4 w-4" />
                      Copy Link
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setFollowerSelectorOpen(true)}
                  className="w-full"
                >
                  <Send className="mr-2 h-4 w-4" />
                  Broadcast
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Follower Selector */}
      {creatorId && (
        <FollowerSelector
          open={followerSelectorOpen}
          onOpenChange={setFollowerSelectorOpen}
          onSelect={handleBroadcast}
          creatorId={creatorId}
        />
      )}
    </div>
  )
}

