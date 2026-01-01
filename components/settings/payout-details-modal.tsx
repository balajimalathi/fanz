"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2 } from "lucide-react"

interface PayoutItem {
  id: string
  transactionId: string
  amount: number
}

interface PayoutDetails {
  id: string
  periodStart: string
  periodEnd: string
  totalAmount: number
  platformFee: number
  netAmount: number
  status: "pending" | "processing" | "completed" | "failed"
  processedAt: string | null
  createdAt: string
  items: PayoutItem[]
}

interface PayoutDetailsModalProps {
  payoutId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case "completed":
      return "default"
    case "processing":
      return "secondary"
    case "pending":
      return "outline"
    case "failed":
      return "destructive"
    default:
      return "outline"
  }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function PayoutDetailsModal({
  payoutId,
  open,
  onOpenChange,
}: PayoutDetailsModalProps) {
  const [payoutDetails, setPayoutDetails] = useState<PayoutDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && payoutId) {
      setLoading(true)
      setError(null)
      fetch(`/api/creator/payouts/${payoutId}`)
        .then((res) => {
          if (!res.ok) {
            throw new Error("Failed to fetch payout details")
          }
          return res.json()
        })
        .then((data) => {
          setPayoutDetails(data)
        })
        .catch((err) => {
          setError(err.message || "Failed to load payout details")
        })
        .finally(() => {
          setLoading(false)
        })
    } else {
      setPayoutDetails(null)
    }
  }, [open, payoutId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Payout Details</DialogTitle>
          <DialogDescription>
            View detailed information about this payout
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}

        {error && (
          <div className="text-destructive text-sm py-4">{error}</div>
        )}

        {payoutDetails && !loading && (
          <ScrollArea className="max-h-[calc(90vh-120px)]">
            <div className="space-y-6 pr-4">
              {/* Status and Period */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={getStatusBadgeVariant(payoutDetails.status)}>
                    {payoutDetails.status.toUpperCase()}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Period</p>
                  <p className="text-sm font-medium">
                    {formatDate(payoutDetails.periodStart)} -{" "}
                    {formatDate(payoutDetails.periodEnd)}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Amount Details */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Amount</span>
                  <span className="text-sm font-medium">
                    {formatCurrency(payoutDetails.totalAmount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Platform Fee</span>
                  <span className="text-sm font-medium">
                    {formatCurrency(payoutDetails.platformFee)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm font-semibold">Net Amount</span>
                  <span className="text-base font-bold">
                    {formatCurrency(payoutDetails.netAmount)}
                  </span>
                </div>
              </div>

              <Separator />

              {/* Dates */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Created At</span>
                  <span className="text-sm">
                    {formatDate(payoutDetails.createdAt)}
                  </span>
                </div>
                {payoutDetails.processedAt && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Processed At</span>
                    <span className="text-sm">
                      {formatDate(payoutDetails.processedAt)}
                    </span>
                  </div>
                )}
              </div>

              <Separator />

              {/* Transaction Items */}
              <div>
                <h3 className="text-sm font-semibold mb-3">
                  Transactions ({payoutDetails.items.length})
                </h3>
                <div className="space-y-2">
                  {payoutDetails.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-center p-2 rounded-md bg-muted/50"
                    >
                      <span className="text-xs text-muted-foreground font-mono">
                        {item.transactionId.slice(0, 8)}...
                      </span>
                      <span className="text-sm font-medium">
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  )
}

