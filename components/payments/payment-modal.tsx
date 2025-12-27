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
import { Loader2, CheckCircle2, XCircle } from "lucide-react"
import { useRouter } from "next/navigation"

interface PaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: "membership" | "exclusive_post" | "service"
  entityId: string
  amount: number // Amount in rupees
  title: string
  description?: string
  duration?: number // Duration in months (for membership subscriptions)
  originUrl?: string // Origin URL for redirect after payment
  onSuccess?: () => void
}

export function PaymentModal({
  open,
  onOpenChange,
  type,
  entityId,
  amount,
  title,
  description,
  duration,
  originUrl,
  onSuccess,
}: PaymentModalProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handlePayment = async () => {
    setIsProcessing(true)
    setError(null)

    try {
      const response = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type,
          entityId,
          duration,
          originUrl,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to initiate payment")
      }

      if (data.paymentUrl) {
        // Redirect to payment gateway
        window.location.href = data.paymentUrl
      } else {
        throw new Error("Payment URL not received")
      }
    } catch (err) {
      console.error("Payment error:", err)
      setError(err instanceof Error ? err.message : "Failed to process payment")
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <span className="text-sm font-medium">Total Amount</span>
            <span className="text-2xl font-bold">₹{amount.toLocaleString("en-IN")}</span>
          </div>
          {duration && duration > 1 && (
            <div className="text-sm text-muted-foreground text-center">
              Subscription duration: {duration} {duration === 1 ? "month" : "months"}
            </div>
          )}

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">{error}</p>
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
              onClick={handlePayment}
              disabled={isProcessing}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Pay Now"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

