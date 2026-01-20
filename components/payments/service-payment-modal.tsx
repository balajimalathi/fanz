"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { PriceDisplay } from "@/components/currency/price-display"
import { toSubunits } from "@/lib/currency/currency-utils"

interface ServicePaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceId: string
  amount: number // Amount in display format
  currency?: string // ISO 4217 currency code (defaults to INR for backward compatibility)
  title: string
  description?: string
  originUrl?: string // Origin URL for redirect after payment
  onSuccess?: () => void
}

export function ServicePaymentModal({
  open,
  onOpenChange,
  serviceId,
  amount,
  currency = "INR",
  title,
  description,
  originUrl,
  onSuccess,
}: ServicePaymentModalProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customerDescription, setCustomerDescription] = useState("")
  const [descriptionError, setDescriptionError] = useState<string | null>(null)
  const router = useRouter()

  const handlePayment = async () => {
    // Validate description
    const trimmedDescription = customerDescription.trim()
    if (!trimmedDescription) {
      setDescriptionError("Please describe what you want. This field is required.")
      return
    }

    if (trimmedDescription.length < 10) {
      setDescriptionError("Please provide more details (at least 10 characters).")
      return
    }

    if (trimmedDescription.length > 2000) {
      setDescriptionError("Description must be less than 2000 characters.")
      return
    }

    setDescriptionError(null)
    setIsProcessing(true)
    setError(null)

    try {
      const response = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "service",
          entityId: serviceId,
          customerDescription: trimmedDescription,
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

  const handleClose = () => {
    if (!isProcessing) {
      setCustomerDescription("")
      setDescriptionError(null)
      setError(null)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="customer-description">
              What would you like? <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="customer-description"
              value={customerDescription}
              onChange={(e) => {
                setCustomerDescription(e.target.value)
                if (descriptionError) {
                  setDescriptionError(null)
                }
              }}
              placeholder="Please describe in detail what you want from this service..."
              rows={5}
              disabled={isProcessing}
              className={descriptionError ? "border-destructive" : ""}
            />
            {descriptionError && (
              <p className="text-sm text-destructive">{descriptionError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {customerDescription.length}/2000 characters
            </p>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <span className="text-sm font-medium">Total Amount</span>
            <span className="text-2xl font-bold">
              <PriceDisplay
                amount={toSubunits(amount, currency || "INR")}
                originalCurrency={currency || "INR"}
              />
            </span>
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isProcessing}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePayment}
              disabled={isProcessing || !customerDescription.trim()}
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
