"use client"

import { useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreVertical, User, Flag, Share2 } from "lucide-react"
import { useSession } from "@/lib/auth/auth-client"
import { CustomerProfileModal } from "./customer-profile-modal"
import { ReportCreatorDialog } from "@/components/report/report-creator-dialog"

interface MoreOptionsMenuProps {
  creatorId: string
  creatorName: string
  className?: string
}

export function MoreOptionsMenu({
  creatorId,
  creatorName,
  className,
}: MoreOptionsMenuProps) {
  const { data: session } = useSession()
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showReportDialog, setShowReportDialog] = useState(false)
  const isAuthenticated = !!session?.user
  const canReport = isAuthenticated && session?.user?.id !== creatorId

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${creatorName} on DesiFans`,
          text: `Check out ${creatorName} on DesiFans`,
          url: url,
        })
      } catch (error) {
        // User cancelled or error occurred
        console.log("Share cancelled or failed:", error)
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(url)
        // You might want to show a toast here
      } catch (error) {
        console.error("Failed to copy URL:", error)
      }
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className={`rounded-full ${className || ""}`}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isAuthenticated && (
            <>
              <DropdownMenuItem onClick={() => setShowProfileModal(true)}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={handleShare}>
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </DropdownMenuItem>
          {canReport && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowReportDialog(true)}
                className="text-destructive focus:text-destructive"
              >
                <Flag className="mr-2 h-4 w-4" />
                Report
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <CustomerProfileModal
        open={showProfileModal}
        onOpenChange={setShowProfileModal}
      />
      <ReportCreatorDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        creatorId={creatorId}
      />
    </>
  )
}
