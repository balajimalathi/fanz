"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PaymentModal } from "./payment-modal"
import { PriceDisplay } from "@/components/currency/price-display"

interface ExclusivePostOverlayProps {
  postId: string
  price: number // Price in subunits
  currency?: string
  caption?: string | null
  onPurchaseComplete?: () => void
}

export function ExclusivePostOverlay({
  postId,
  price,
  currency,
  caption,
  onPurchaseComplete,
}: ExclusivePostOverlayProps) {
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const pathname = usePathname()

  const currentOriginUrl =
    typeof window !== "undefined" ? window.location.href : pathname || "/"

  return (
    <>
      <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-4 text-white p-6 max-w-md text-center">
          <Lock className="h-12 w-12" />
          <div>
            <h3 className="text-xl font-semibold mb-2">Exclusive Content</h3>
            {caption && (
              <p className="text-sm text-white/80 mb-4 line-clamp-2">{caption}</p>
            )}
            <p className="text-2xl font-bold mb-4">
              <PriceDisplay
                amount={price}
                currency={currency}
                className="text-2xl font-bold"
              />
            </p>
            <Button
              size="lg"
              onClick={() => setShowPaymentModal(true)}
              className="bg-primary hover:bg-primary/90"
            >
              Unlock Content
            </Button>
          </div>
        </div>
      </div>

      <PaymentModal
        open={showPaymentModal}
        onOpenChange={setShowPaymentModal}
        type="exclusive_post"
        entityId={postId}
        amount={price}
        currency={currency}
        title="Purchase Exclusive Post"
        description="Unlock this exclusive content by purchasing it"
        originUrl={currentOriginUrl}
        onSuccess={() => {
          setShowPaymentModal(false)
          onPurchaseComplete?.()
        }}
      />
    </>
  )
}

