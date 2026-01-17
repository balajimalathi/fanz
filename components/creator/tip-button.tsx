"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { TipModal } from "./tip-modal"
import { useSession } from "@/lib/auth/auth-client"
import { LoginModal } from "./login-modal"

interface TipButtonProps {
  creatorId: string
  creatorName: string
  currency?: string
  className?: string
}

export function TipButton({ 
  creatorId, 
  creatorName, 
  currency = "USD",
  className 
}: TipButtonProps) {
  const { data: session } = useSession()
  const [showTipModal, setShowTipModal] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const isAuthenticated = !!session?.user

  const handleTipClick = () => {
    if (!isAuthenticated) {
      setShowLoginModal(true)
      return
    }
    setShowTipModal(true)
  }

  return (
    <>
      <Button
        onClick={handleTipClick}
        className={`bg-blue-600 hover:bg-blue-700 text-white ${className || ""}`}
      >
        Tip
      </Button>
      {isAuthenticated && (
        <TipModal
          open={showTipModal}
          onOpenChange={setShowTipModal}
          creatorId={creatorId}
          creatorName={creatorName}
          currency={currency}
        />
      )}
      <LoginModal
        open={showLoginModal}
        onOpenChange={setShowLoginModal}
      />
    </>
  )
}
