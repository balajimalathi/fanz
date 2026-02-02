"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import toast from "react-hot-toast"
import { Loader2, Search, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface Follower {
  id: string
  followerId: string
  followerName: string
  followerEmail: string
}

interface PostNotifyModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  postId: string
  creatorId: string
  onSuccess?: () => void
}

export function PostNotifyModal({
  open,
  onOpenChange,
  postId,
  creatorId,
  onSuccess,
}: PostNotifyModalProps) {
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [followers, setFollowers] = useState<Follower[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open && creatorId) {
      setTitle("")
      setMessage("")
      setSelectedIds(new Set())
      setSearch("")
      fetchFollowers()
    }
  }, [open, creatorId])

  const fetchFollowers = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/followers?creatorId=${creatorId}`)
      if (!response.ok) throw new Error("Failed to fetch followers")
      const data = await response.json()
      setFollowers(data)
    } catch (error) {
      console.error("Error fetching followers:", error)
      toast.error("Failed to load followers")
    } finally {
      setIsLoading(false)
    }
  }

  const filteredFollowers = followers.filter(
    (f) =>
      f.followerName?.toLowerCase().includes(search.toLowerCase()) ||
      f.followerEmail?.toLowerCase().includes(search.toLowerCase())
  )

  const toggleSelection = (followerId: string) => {
    const next = new Set(selectedIds)
    if (next.has(followerId)) next.delete(followerId)
    else next.add(followerId)
    setSelectedIds(next)
  }

  const handleSelectAll = () => {
    if (selectedIds.size === filteredFollowers.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredFollowers.map((f) => f.followerId)))
    }
  }

  const handleSubmit = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error("Please fill in both title and description")
      return
    }
    if (selectedIds.size === 0) {
      toast.error("Please select at least one follower")
      return
    }
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/posts/${postId}/broadcast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          followerIds: Array.from(selectedIds),
          title: title.trim(),
          message: message.trim(),
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to send notifications")
      toast.success(`Notifications sent to ${data.notificationsCreated ?? selectedIds.size} followers`)
      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      console.error("Error sending notifications:", error)
      toast.error(error instanceof Error ? error.message : "Failed to send notifications")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Notify followers</DialogTitle>
          <DialogDescription>
            Select followers and send a custom notification about this post.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 flex-1 min-h-0 flex flex-col">
          <div className="space-y-2">
            <Label htmlFor="notify-title">Title</Label>
            <Input
              id="notify-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Notification title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notify-message">Description</Label>
            <Textarea
              id="notify-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Message body"
              rows={3}
            />
          </div>
          <div className="space-y-2 flex-1 min-h-0 flex flex-col">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search followers..."
                  className="pl-9"
                />
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleSelectAll}>
                {selectedIds.size === filteredFollowers.length ? "Deselect all" : "Select all"}
              </Button>
            </div>
            <ScrollArea className="flex-1 min-h-[200px] rounded-md border">
              <div className="p-2 space-y-1">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredFollowers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No followers found
                  </p>
                ) : (
                  filteredFollowers.map((follower) => {
                    const isSelected = selectedIds.has(follower.followerId)
                    return (
                      <button
                        key={follower.id}
                        type="button"
                        onClick={() => toggleSelection(follower.followerId)}
                        className={cn(
                          "w-full text-left p-3 rounded-lg border transition-colors flex items-center justify-between",
                          isSelected
                            ? "border-primary bg-primary/10"
                            : "border-border hover:bg-accent"
                        )}
                      >
                        <div>
                          <p className="font-medium">{follower.followerName}</p>
                          <p className="text-sm text-muted-foreground">{follower.followerEmail}</p>
                        </div>
                        {isSelected && <Check className="h-5 w-5 text-primary" />}
                      </button>
                    )
                  })
                )}
              </div>
            </ScrollArea>
            <p className="text-xs text-muted-foreground">
              {selectedIds.size} of {followers.length} selected
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              "Send"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
