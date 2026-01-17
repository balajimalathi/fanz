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
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"
import { usePathname } from "next/navigation"
import { PriceDisplay } from "@/components/currency/price-display"
import { toSubunits } from "@/lib/currency/currency-utils"
import { toast } from "sonner"

interface TipModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  creatorId: string
  creatorName: string
  currency?: string
  initialAmount?: number
}

const PRESET_AMOUNTS = [3, 5, 10, 25, 50, 100]

export function TipModal({
  open,
  onOpenChange,
  creatorId,
  creatorName,
  currency = "USD",
  initialAmount,
}: TipModalProps) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(initialAmount || null)
  const [customAmount, setCustomAmount] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const pathname = usePathname()
  const currentOriginUrl =
    typeof window !== "undefined" ? window.location.href : pathname || "/"

  // Reset when modal opens/closes
  useEffect(() => {
    if (open && initialAmount) {
      setSelectedAmount(initialAmount)
      setCustomAmount("")
    } else if (!open) {
      setSelectedAmount(null)
      setCustomAmount("")
    }
  }, [open, initialAmount])

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount)
    setCustomAmount("")
  }

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value)
    setSelectedAmount(null)
  }

  const getFinalAmount = (): number => {
    if (selectedAmount !== null) {
      return selectedAmount
    }
    const custom = parseFloat(customAmount)
    return isNaN(custom) || custom <= 0 ? 0 : custom
  }

  const handleTip = async () => {
    const amount = getFinalAmount()
    if (amount <= 0) {
      toast.error("Please enter a valid tip amount")
      return
    }

    setIsProcessing(true)
    try {
      // For now, we'll use wallet_credit type or create a tip endpoint
      // This is a simplified version - you may need to create a dedicated tip API endpoint
      const response = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "wallet_credit", // Using wallet credit as tip mechanism
          entityId: creatorId, // Using creatorId as entityId for tips
          amount: amount,
          currency: currency,
          originUrl: currentOriginUrl,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to process tip")
      }

      if (data.paymentUrl) {
        window.location.href = data.paymentUrl
      } else {
        toast.success("Tip sent successfully!")
        onOpenChange(false)
        setSelectedAmount(null)
        setCustomAmount("")
      }
    } catch (error) {
      console.error("Tip error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to send tip")
    } finally {
      setIsProcessing(false)
    }
  }

  const finalAmount = getFinalAmount()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tip {creatorName}</DialogTitle>
          <DialogDescription>
            Show your appreciation with a tip
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Preset Amounts */}
          <div className="grid grid-cols-3 gap-2">
            {PRESET_AMOUNTS.map((amount) => (
              <Button
                key={amount}
                variant={selectedAmount === amount ? "default" : "outline"}
                onClick={() => handleAmountSelect(amount)}
                className={
                  selectedAmount === amount
                    ? "bg-blue-600 hover:bg-blue-700"
                    : ""
                }
              >
                ${amount}
              </Button>
            ))}
          </div>

          {/* Custom Amount */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Custom Amount</label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{currency === "USD" ? "$" : currency}</span>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="Enter amount"
                value={customAmount}
                onChange={(e) => handleCustomAmountChange(e.target.value)}
              />
            </div>
          </div>

          {/* Total Display */}
          {finalAmount > 0 && (
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <span className="text-sm font-medium">Total Amount</span>
              <span className="text-2xl font-bold">
                <PriceDisplay
                  amount={toSubunits(finalAmount, currency)}
                  originalCurrency={currency}
                />
              </span>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isProcessing}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleTip}
              disabled={isProcessing || finalAmount <= 0}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Send Tip"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
