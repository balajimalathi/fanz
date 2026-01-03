"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PaymentModal } from "./payment-modal"
import { PriceDisplay } from "@/components/currency/price-display"
import { toSubunits } from "@/lib/currency/currency-utils"

interface ExclusivePostOverlayProps {
  postId: string
  price: number // Price in display format (e.g., 500 for ₹500)
  currency?: string // ISO 4217 currency code (defaults to INR for backward compatibility)
  caption?: string | null
  onPurchaseComplete?: () => void
}

export function ExclusivePostOverlay({
  postId,
  price,
  currency = "INR",
  caption,
  onPurchaseComplete,
}: ExclusivePostOverlayProps) {
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const pathname = usePathname()

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
                amount={toSubunits(price, currency)}
                originalCurrency={currency}
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
        title="Purchase Exclusive Post"
        description="Unlock this exclusive content by purchasing it"
        originUrl={pathname || undefined}
        onSuccess={() => {
          setShowPaymentModal(false)
          onPurchaseComplete?.()
        }}
      />
    </>
  )
}

