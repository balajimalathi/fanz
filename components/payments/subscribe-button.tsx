"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { MembershipSelectionModal } from "./membership-selection-modal"
import { Loader2 } from "lucide-react"

interface SubscribeButtonProps {
  creatorId: string
  memberships: Array<{
    id: string
    title: string
    description: string
    monthlyRecurringFee: number
    coverImageUrl?: string | null
  }>
}

export function SubscribeButton({ creatorId, memberships }: SubscribeButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const pathname = usePathname()

  if (memberships.length === 0) {
    return null
  }

  return (
    <>
      <Button
        onClick={() => setIsModalOpen(true)}
        size="lg"
        className="w-full sm:w-auto"
      >
        Subscribe Now
      </Button>
      <MembershipSelectionModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        creatorId={creatorId}
        memberships={memberships}
        originUrl={pathname || undefined}
      />
    </>
  )
}

