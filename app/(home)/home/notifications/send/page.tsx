"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Send, Users, Check } from "lucide-react"
import { toast } from "sonner"
import { useSession } from "@/lib/auth/auth-client"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface Follower {
  id: string
  followerId: string
  followerName: string
  followerEmail: string
}

export default function SendNotificationPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [link, setLink] = useState("")
  const [sendToAll, setSendToAll] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [followers, setFollowers] = useState<Follower[]>([])
  const [selectedFollowerIds, setSelectedFollowerIds] = useState<Set<string>>(new Set())
  const [isLoadingFollowers, setIsLoadingFollowers] = useState(false)
  const [isFollowerSheetOpen, setIsFollowerSheetOpen] = useState(false)

  useEffect(() => {
    if (session?.user?.id) {
      fetchFollowers()
    }
  }, [session?.user?.id])

  const fetchFollowers = async () => {
    if (!session?.user?.id) return

    try {
      setIsLoadingFollowers(true)
      const response = await fetch(`/api/followers?creatorId=${session.user.id}`)
      if (!response.ok) {
        throw new Error("Failed to fetch followers")
      }
      const data = await response.json()
      setFollowers(data)
    } catch (error) {
      console.error("Error fetching followers:", error)
      toast.error("Failed to load followers")
    } finally {
      setIsLoadingFollowers(false)
    }
  }

  const toggleFollowerSelection = (followerId: string) => {
    const newSelected = new Set(selectedFollowerIds)
    if (newSelected.has(followerId)) {
      newSelected.delete(followerId)
    } else {
      newSelected.add(followerId)
    }
    setSelectedFollowerIds(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedFollowerIds.size === followers.length) {
      setSelectedFollowerIds(new Set())
    } else {
      setSelectedFollowerIds(new Set(followers.map((f) => f.followerId)))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim() || !message.trim()) {
      toast.error("Please fill in both title and message")
      return
    }

    if (!sendToAll && selectedFollowerIds.size === 0) {
      toast.error("Please select at least one follower or select 'Send to all followers'")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/notifications/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          link: link.trim() || undefined,
          followerIds: sendToAll ? undefined : Array.from(selectedFollowerIds),
          sendToAll,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(data.message || "Notifications sent successfully!")
        // Reset form
        setTitle("")
        setMessage("")
        setLink("")
        setSendToAll(false)
        setSelectedFollowerIds(new Set())
        // Navigate back to notifications page
        router.push("/home/notifications")
      } else {
        toast.error(data.error || "Failed to send notifications")
      }
    } catch (error) {
      console.error("Error sending notifications:", error)
      toast.error("Failed to send notifications")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!session?.user) {
    return (
      <div className="container max-w-4xl mx-auto py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Please log in to send notifications</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Send Notification</h1>
        <p className="text-muted-foreground">
          Send a notification to your followers
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notification Details</CardTitle>
          <CardDescription>
            Enter the title and message for your notification
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter notification title"
                required
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter notification message"
                required
                rows={5}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                {message.length}/500 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="link">Link (Optional)</Label>
              <Input
                id="link"
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://example.com/page"
              />
              <p className="text-xs text-muted-foreground">
                Optional link that will open when the notification is clicked
              </p>
            </div>

            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sendToAll"
                  checked={sendToAll}
                  onCheckedChange={(checked: boolean) => {
                    setSendToAll(checked)
                    if (checked) {
                      setSelectedFollowerIds(new Set())
                    }
                  }}
                />
                <Label
                  htmlFor="sendToAll"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Send to all followers ({followers.length} total)
                </Label>
              </div>

              {!sendToAll && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Select Followers</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsFollowerSheetOpen(true)}
                    >
                      <Users className="mr-2 h-4 w-4" />
                      {selectedFollowerIds.size > 0
                        ? `${selectedFollowerIds.size} selected`
                        : "Select followers"}
                    </Button>
                  </div>
                  {selectedFollowerIds.size > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {selectedFollowerIds.size} follower{selectedFollowerIds.size !== 1 ? "s" : ""} selected
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Notification
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Follower Selection Sheet */}
      <Sheet open={isFollowerSheetOpen} onOpenChange={setIsFollowerSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Select Followers</SheetTitle>
            <SheetDescription>
              Choose which followers to send the notification to
            </SheetDescription>
          </SheetHeader>

          {isLoadingFollowers ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : followers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No followers found
            </div>
          ) : (
            <>
              <div className="mt-4 mb-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className="w-full"
                >
                  {selectedFollowerIds.size === followers.length
                    ? "Deselect All"
                    : "Select All"}
                </Button>
              </div>

              <ScrollArea className="h-[calc(100vh-250px)]">
                <div className="space-y-2">
                  {followers.map((follower) => {
                    const isSelected = selectedFollowerIds.has(follower.followerId)
                    return (
                      <button
                        key={follower.id}
                        type="button"
                        onClick={() => toggleFollowerSelection(follower.followerId)}
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

              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-4">
                  {selectedFollowerIds.size} of {followers.length} selected
                </p>
                <Button
                  onClick={() => setIsFollowerSheetOpen(false)}
                  className="w-full"
                >
                  Done
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

