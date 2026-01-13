"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Coins, Sparkles } from "lucide-react"
import { usePathname } from "next/navigation"
import { PriceDisplay } from "@/components/currency/price-display"
import { toSubunits } from "@/lib/currency/currency-utils"
import { WalletService } from "@/lib/wallet/wallet-service"

interface CreditPlan {
  id: "starter" | "favorite" | "vip"
  name: string
  coins: number
  price: number // in paise
  bonus: number
  totalCoins: number
  discount?: string
  popular?: boolean
}

interface CreditPurchaseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  creatorId: string
  onPurchaseSuccess?: () => void
}

export function CreditPurchaseModal({
  open,
  onOpenChange,
  creatorId,
  onPurchaseSuccess,
}: CreditPurchaseModalProps) {
  const pathname = usePathname()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<CreditPlan | null>(null)
  const [isFirstPurchase, setIsFirstPurchase] = useState(false)
  const [plans, setPlans] = useState<CreditPlan[]>([])

  // Get origin URL
  const currentOriginUrl =
    typeof window !== "undefined" ? window.location.href : pathname || "/"

  // Fetch plans from API (they're configured in env)
  useEffect(() => {
    if (open) {
      // Fetch plans - we'll get them from the server
      fetch("/api/wallet/plans")
        .then((res) => res.json())
        .then((data) => {
          if (data.plans) {
            setPlans(data.plans)
          }
        })
        .catch(console.error)

      // Check if this is first purchase
      fetch("/api/wallet/first-purchase")
        .then((res) => res.json())
        .then((data) => {
          setIsFirstPurchase(!data.hasPreviousPurchase)
        })
        .catch(console.error)
    }
  }, [open])

  // Default plans (fallback if API fails)
  const defaultPlans: CreditPlan[] = [
    {
      id: "starter",
      name: "Starter",
      coins: 200,
      price: 9900, // ₹99 in paise
      bonus: 50,
      totalCoins: 250,
      discount: "75% OFF first-time",
    },
    {
      id: "favorite",
      name: "Fan Favorite",
      coins: 1300,
      price: 89900, // ₹899 in paise
      bonus: 300,
      totalCoins: 1600,
      popular: true,
    },
    {
      id: "vip",
      name: "VIP Whale",
      coins: 9000,
      price: 449900, // ₹4,499 in paise
      bonus: 3000,
      totalCoins: 12000,
    },
  ]

  const displayPlans = plans.length > 0 ? plans : defaultPlans

  const handlePurchase = async (plan: CreditPlan) => {
    setIsProcessing(true)
    setError(null)
    setSelectedPlan(plan)

    try {
      const response = await fetch("/api/wallet/purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planType: plan.id,
          creatorId,
          originUrl: currentOriginUrl,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to initiate payment")
      }

      if (data.paymentUrl) {
        // Redirect to payment gateway (same approach as other payments)
        window.location.href = data.paymentUrl
      } else {
        throw new Error("Payment URL not received")
      }
    } catch (err) {
      console.error("Payment error:", err)
      setError(err instanceof Error ? err.message : "Failed to process payment")
      setIsProcessing(false)
      setSelectedPlan(null)
    }
  }

  // Handle payment success redirect
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search)
      const status = urlParams.get("status")
      const planType = urlParams.get("planType")

      if (status === "success" && planType) {
        // Payment successful
        onPurchaseSuccess?.()
        onOpenChange(false)
        // Clean up URL
        window.history.replaceState({}, "", window.location.pathname)
      } else if (status === "failed") {
        setError("Payment failed. Please try again.")
        // Clean up URL
        window.history.replaceState({}, "", window.location.pathname)
      }
    }
  }, [onPurchaseSuccess, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Purchase Credits
          </DialogTitle>
          <DialogDescription>
            Choose a credit plan to unlock DMs, audio/video calls, and livestreams
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {displayPlans.map((plan) => {
              const isStarter = plan.id === "starter"
              const showDiscount = isStarter && isFirstPurchase && plan.discount

              return (
                <div
                  key={plan.id}
                  className={`relative border rounded-lg p-6 transition-all ${
                    plan.popular
                      ? "border-primary bg-primary/5 shadow-md scale-105"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {plan.popular && (
                    <Badge
                      className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground"
                      variant="default"
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      MOST POPULAR
                    </Badge>
                  )}

                  {showDiscount && (
                    <Badge
                      className="absolute -top-3 right-4 bg-orange-500 text-white"
                      variant="default"
                    >
                      {plan.discount}
                    </Badge>
                  )}

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold">
                          <PriceDisplay
                            amount={plan.price}
                            originalCurrency="INR"
                          />
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Base Coins</span>
                        <span className="font-medium">{plan.coins.toLocaleString()}</span>
                      </div>
                      {plan.bonus > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Bonus</span>
                          <span className="font-medium text-primary">
                            +{plan.bonus.toLocaleString()}
                          </span>
                        </div>
                      )}
                      <div className="border-t pt-2 flex items-center justify-between">
                        <span className="font-semibold">Total</span>
                        <span className="text-lg font-bold text-primary">
                          {plan.totalCoins.toLocaleString()} coins
                        </span>
                      </div>
                    </div>

                    <Button
                      onClick={() => handlePurchase(plan)}
                      disabled={isProcessing}
                      className="w-full"
                      variant={plan.popular ? "default" : "outline"}
                    >
                      {isProcessing && selectedPlan?.id === plan.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        "Purchase"
                      )}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex justify-end pt-4">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
