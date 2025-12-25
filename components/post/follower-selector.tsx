"use client"

import { useState, useEffect } from "react"
import { Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import toast from "react-hot-toast"

interface Follower {
  id: string
  followerId: string
  followerName: string
  followerEmail: string
}

interface FollowerSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (followerIds: string[]) => void
  creatorId: string
}

export function FollowerSelector({
  open,
  onOpenChange,
  onSelect,
  creatorId,
}: FollowerSelectorProps) {
  const [followers, setFollowers] = useState<Follower[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      fetchFollowers()
    } else {
      setSelectedIds(new Set())
    }
  }, [open, creatorId])

  const fetchFollowers = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/followers?creatorId=${creatorId}`)
      if (!response.ok) {
        throw new Error("Failed to fetch followers")
      }
      const data = await response.json()
      setFollowers(data)
    } catch (error) {
      console.error("Error fetching followers:", error)
      toast.error("Failed to load followers")
    } finally {
      setIsLoading(false)
    }
  }

  const toggleSelection = (followerId: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(followerId)) {
      newSelected.delete(followerId)
    } else {
      newSelected.add(followerId)
    }
    setSelectedIds(newSelected)
  }

  const handleSubmit = () => {
    if (selectedIds.size === 0) {
      toast.error("Please select at least one follower")
      return
    }
    setIsSubmitting(true)
    onSelect(Array.from(selectedIds))
    setIsSubmitting(false)
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Select Followers</SheetTitle>
          <SheetDescription>
            Choose which followers to broadcast this post to
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : followers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No followers found
          </div>
        ) : (
          <>
            <ScrollArea className="h-[calc(100vh-200px)] mt-4">
              <div className="space-y-2">
                {followers.map((follower) => {
                  const isSelected = selectedIds.has(follower.followerId)
                  return (
                    <button
                      key={follower.id}
                      type="button"
                      onClick={() => toggleSelection(follower.followerId)}
                      className={cn(
                        "w-full text-left p-3 rounded-lg border transition-colors",
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-border hover:bg-accent"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{follower.followerName}</p>
                          <p className="text-sm text-muted-foreground">
                            {follower.followerEmail}
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
            </ScrollArea>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {selectedIds.size} of {followers.length} selected
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
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
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

