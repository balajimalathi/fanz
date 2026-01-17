"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Coins } from "lucide-react"
import { CreditPurchaseModal } from "./credit-purchase-modal"
import { useSession } from "@/lib/auth/auth-client"

interface FanCreditsDisplayProps {
  creatorId: string
}

export function FanCreditsDisplay({ creatorId }: FanCreditsDisplayProps) {
  const { data: session } = useSession()
  const [balance, setBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)

  // Don't show if user is the creator themselves
  const isCreator = session?.user?.id === creatorId
  const isAuthenticated = !!session?.user

  useEffect(() => {
    if (!isAuthenticated || isCreator) {
      setLoading(false)
      return
    }

    // Fetch wallet balance
    const fetchBalance = async () => {
      try {
        const response = await fetch("/api/wallet/balance")
        if (response.ok) {
          const data = await response.json()
          setBalance(data.balance)
        }
      } catch (error) {
        console.error("Error fetching wallet balance:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchBalance()

    // Refresh balance when payment succeeds (check URL params)
    const checkPaymentStatus = () => {
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search)
        const status = urlParams.get("status")
        if (status === "success") {
          fetchBalance()
        }
      }
    }

    checkPaymentStatus()
  }, [isAuthenticated, isCreator])

  // Don't render if not authenticated or if user is the creator
  if (!isAuthenticated || isCreator) {
    return null
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowPurchaseModal(true)}
        className="flex items-center gap-1.5 px-3 py-1.5"
      >
        <Coins className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">
          {loading ? "..." : balance !== null ? balance.toLocaleString() : "0"}
        </span>
      </Button>
      <CreditPurchaseModal
        open={showPurchaseModal}
        onOpenChange={setShowPurchaseModal}
        creatorId={creatorId}
        onPurchaseSuccess={() => {
          // Refresh balance after successful purchase
          fetch("/api/wallet/balance")
            .then((res) => res.json())
            .then((data) => {
              setBalance(data.balance)
            })
            .catch(console.error)
        }}
      />
    </>
  )
}
