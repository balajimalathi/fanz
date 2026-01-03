"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useSession } from "@/lib/auth/auth-client"
import { PaymentModal } from "@/components/payments/payment-modal"
import { PriceDisplay } from "@/components/currency/price-display"
import { toSubunits } from "@/lib/currency/currency-utils"

interface ServiceDisplayCardProps {
  id: string
  name: string
  description: string
  price: number // Price in display format
  currency?: string // ISO 4217 currency code (defaults to INR for backward compatibility)
  creatorId: string
}

export function ServiceDisplayCard({
  id,
  name,
  description,
  price,
  currency = "INR",
  creatorId,
}: ServiceDisplayCardProps) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Check if user is authenticated and not the creator
  const isAuthenticated = !!session?.user
  const isCreator = session?.user?.id === creatorId
  const showPurchaseButton = isAuthenticated && !isCreator

  return (
    <>
      <Card className="h-full hover:shadow-md transition-shadow flex flex-col">
        <CardContent className="pt-6 flex flex-col flex-1">
          <div className="space-y-3 flex-1">
            <div>
              <h3 className="font-semibold text-lg mb-1">{name}</h3>
              {description && (
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {description}
                </p>
              )}
            </div>
            <div className="pt-2 border-t">
              <p className="text-primary font-semibold text-lg">
                <PriceDisplay
                  amount={toSubunits(price, currency)}
                  originalCurrency={currency}
                />
              </p>
            </div>
          </div>
          {showPurchaseButton && (
            <div className="pt-4 mt-auto">
              <Button
                onClick={() => setIsModalOpen(true)}
                className="w-full"
                size="sm"
              >
                Purchase
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <PaymentModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        type="service"
        entityId={id}
        amount={price}
        title={`Purchase ${name}`}
        description={description}
        originUrl={pathname || undefined}
      />
    </>
  )
}

