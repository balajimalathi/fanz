"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { BarChart3 } from "lucide-react"

interface PostAnalyticsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  postId: string
}

export function PostAnalyticsModal({
  open,
  onOpenChange,
  postId,
}: PostAnalyticsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Post analytics</DialogTitle>
          <DialogDescription>
            Performance and engagement for this post.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Revenue generated</p>
            <p className="text-2xl font-semibold text-muted-foreground">—</p>
            <p className="text-xs text-muted-foreground">Coming soon</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Users accessing</p>
            <p className="text-2xl font-semibold text-muted-foreground">—</p>
            <p className="text-xs text-muted-foreground">Coming soon</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Like and comment trend
            </p>
            <p className="text-sm text-muted-foreground">Coming soon</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
