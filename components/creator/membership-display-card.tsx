"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { usePathname, useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useSession } from "@/lib/auth/auth-client"
import { MembershipSelectionModal } from "@/components/payments/membership-selection-modal"
import { CheckCircle2 } from "lucide-react"
import { PriceDisplay } from "@/components/currency/price-display"
import { toSubunits } from "@/lib/currency/currency-utils"

interface MembershipDisplayCardProps {
  id: string
  title: string
  description: string
  monthlyRecurringFee: number // Price in display format
  currency?: string // ISO 4217 currency code (defaults to INR for backward compatibility)
  coverImageUrl: string | null
  creatorId: string
}

export function MembershipDisplayCard({
  id,
  title,
  description,
  monthlyRecurringFee,
  currency = "INR",
  coverImageUrl,
  creatorId,
}: MembershipDisplayCardProps) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(true)
  const [subscriptionEndDate, setSubscriptionEndDate] = useState<Date | null>(null)

  // Check if user is authenticated and not the creator
  const isAuthenticated = !!session?.user
  const isCreator = session?.user?.id === creatorId

  // Function to check subscription status
  const checkSubscription = useCallback(async () => {
    if (!isAuthenticated || isCreator) {
      setIsCheckingSubscription(false)
      return
    }

    try {
      setIsCheckingSubscription(true)
      const response = await fetch(`/api/memberships/${id}/subscription-status`)
      if (response.ok) {
        const data = await response.json()
        setIsSubscribed(data.isSubscribed)
        if (data.subscription?.currentPeriodEnd) {
          setSubscriptionEndDate(new Date(data.subscription.currentPeriodEnd))
        }
      }
    } catch (error) {
      console.error("Error checking subscription status:", error)
    } finally {
      setIsCheckingSubscription(false)
    }
  }, [id, isAuthenticated, isCreator])

  // Check subscription status on mount and when dependencies change
  useEffect(() => {
    checkSubscription()
  }, [checkSubscription])

  // Refresh subscription status when payment is successful (query param changes)
  useEffect(() => {
    const status = searchParams.get("status")
    const membershipId = searchParams.get("membershipId")
    
    // If payment was successful for this membership, refresh subscription status
    if (status === "success" && membershipId === id) {
      // Small delay to ensure database is updated
      setTimeout(() => {
        checkSubscription()
      }, 1000)
    }
  }, [searchParams, id, checkSubscription])

  const showSubscribeButton = isAuthenticated && !isCreator && !isSubscribed

  return (
    <>
      <Card className="h-full hover:shadow-md transition-shadow overflow-hidden flex flex-col">
        {coverImageUrl && (
          <div className="relative w-full h-40 sm:h-48 overflow-hidden">
            <Image
              src={coverImageUrl}
              alt={title}
              fill
              className="object-cover"
            />
          </div>
        )}
        <CardContent className={cn("pt-6 flex flex-col flex-1", coverImageUrl && "pt-4")}>
          <div className="space-y-3 flex-1">
            <div>
              <h3 className="font-semibold text-lg mb-1">{title}</h3>
              {description && (
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {description}
                </p>
              )}
            </div>
            <div className="pt-2 border-t">
              <p className="text-primary font-semibold text-lg">
                <PriceDisplay
                  amount={toSubunits(monthlyRecurringFee, currency)}
                  originalCurrency={currency}
                />
                <span className="text-sm font-normal text-muted-foreground">/month</span>
              </p>
            </div>
          </div>
          {isAuthenticated && !isCreator && (
            <div className="pt-4 mt-auto">
              {isCheckingSubscription ? (
                <div className="w-full py-2 text-center text-sm text-muted-foreground">
                  Checking...
                </div>
              ) : isSubscribed ? (
                <div className="space-y-2">
                  <Badge
                    variant="secondary"
                    className="w-full justify-center py-2 bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Subscribed
                  </Badge>
                  {subscriptionEndDate && (
                    <p className="text-xs text-center text-muted-foreground">
                      Expires: {subscriptionEndDate.toLocaleDateString()}
                    </p>
                  )}
                </div>
              ) : (
                <Button
                  onClick={() => setIsModalOpen(true)}
                  className="w-full"
                  size="sm"
                >
                  Subscribe
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <MembershipSelectionModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        creatorId={creatorId}
        memberships={[
          {
            id,
            title,
            description,
            monthlyRecurringFee,
            currency,
            coverImageUrl,
          },
        ]}
        originUrl={pathname || undefined}
      />
    </>
  )
}

