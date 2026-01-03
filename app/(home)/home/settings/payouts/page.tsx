"use client"

import { useEffect, useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SubHeading } from "@/components/ui/sub-heading"
import { PayoutDetailsModal } from "@/components/settings/payout-details-modal"
import { Eye, Loader2, DollarSign } from "lucide-react"
import toast from "react-hot-toast"
import { formatCurrency as formatCurrencyUtil } from "@/lib/utils/currency"
import { useCreatorCurrency } from "@/lib/hooks/use-creator-currency"
import { getCurrencySymbol } from "@/lib/currency/currency-utils"

interface Payout {
  id: string
  periodStart: string
  periodEnd: string
  totalAmount: number
  platformFee: number
  netAmount: number
  status: "pending" | "processing" | "completed" | "failed"
  processedAt: string | null
  createdAt: string
}

interface PayoutSettings {
  minimumThreshold?: number
  automaticPayout?: boolean
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
    month: "short",
    day: "numeric",
  })
}

export default function PayoutsPage() {
  const { currency: creatorCurrency, loading: currencyLoading } = useCreatorCurrency()
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [pendingAmount, setPendingAmount] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [requesting, setRequesting] = useState(false)
  const [selectedPayoutId, setSelectedPayoutId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [payoutSettings, setPayoutSettings] = useState<PayoutSettings>({
    minimumThreshold: 1000,
    automaticPayout: false,
  })

  const currency = currencyLoading ? "USD" : creatorCurrency
  const currencySymbol = getCurrencySymbol(currency)

  useEffect(() => {
    fetchPayouts()
    fetchPayoutSettings()
  }, [])

  const fetchPayouts = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/creator/payouts")
      if (!response.ok) {
        throw new Error("Failed to fetch payouts")
      }
      const data = await response.json()
      setPayouts(data.payouts || [])
      setPendingAmount(data.pendingAmount || 0)
    } catch (error) {
      console.error("Error fetching payouts:", error)
      toast.error("Failed to load payouts")
    } finally {
      setLoading(false)
    }
  }

  const fetchPayoutSettings = async () => {
    try {
      const response = await fetch("/api/creator/payout-settings")
      if (response.ok) {
        const data = await response.json()
        setPayoutSettings(data.payoutSettings || { minimumThreshold: 1000, automaticPayout: false })
      }
    } catch (error) {
      console.error("Error fetching payout settings:", error)
    }
  }

  const handleViewDetails = (payoutId: string) => {
    setSelectedPayoutId(payoutId)
    setModalOpen(true)
  }

  const handleRequestPayout = async () => {
    const minimumThreshold = payoutSettings.minimumThreshold || 1000
    const pendingAmountDisplay = pendingAmount

    if (pendingAmountDisplay < minimumThreshold) {
      const thresholdFormatted = formatCurrencyUtil(minimumThreshold * 100, currency)
      const pendingFormatted = formatCurrencyUtil(pendingAmountDisplay * 100, currency)
      toast.error(
        `Minimum threshold of ${thresholdFormatted} not met. Current pending amount: ${pendingFormatted}`
      )
      return
    }

    try {
      setRequesting(true)
      const response = await fetch("/api/creator/payouts/request", {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to request payout")
      }

      toast.success("Payout request created successfully")
      // Refresh payouts list
      await fetchPayouts()
    } catch (error) {
      console.error("Error requesting payout:", error)
      toast.error(
        error instanceof Error ? error.message : "Failed to request payout"
      )
    } finally {
      setRequesting(false)
    }
  }

  const canRequestPayout =
    !payoutSettings.automaticPayout && pendingAmount > 0
  const meetsThreshold =
    pendingAmount >= (payoutSettings.minimumThreshold || 1000)

  return (
    <div className="space-y-6">
      <SubHeading
        title="Payouts"
        description="View your payout history and pending earnings"
      />
      <Separator />

      {/* Pending Earnings Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Pending Earnings</CardTitle>
              <CardDescription>
                Amount waiting to be included in next payout
              </CardDescription>
            </div>
            {canRequestPayout && (
              <Button
                onClick={handleRequestPayout}
                disabled={requesting || !meetsThreshold}
              >
                {requesting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Requesting...
                  </>
                ) : (
                  <>
                    <DollarSign className="h-4 w-4 mr-2" />
                    Request Payout
                  </>
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold">
              {formatCurrencyUtil(pendingAmount * 100, currency)}
            </div>
            {canRequestPayout && !meetsThreshold && (
              <p className="text-sm text-muted-foreground">
                Minimum threshold: {formatCurrencyUtil(
                  (payoutSettings.minimumThreshold || 1000) * 100,
                  currency
                )}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payout History */}
      <Card>
        <CardHeader>
          <CardTitle>Payout History</CardTitle>
          <CardDescription>All your past and current payouts</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : payouts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No payouts yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 text-sm font-semibold">Period</th>
                    <th className="text-left p-3 text-sm font-semibold">Amount</th>
                    <th className="text-left p-3 text-sm font-semibold">Status</th>
                    <th className="text-left p-3 text-sm font-semibold">Processed</th>
                    <th className="text-right p-3 text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((payout) => (
                    <tr key={payout.id} className="border-b hover:bg-muted/50">
                      <td className="p-3 text-sm">
                        <div>
                          <div>{formatDate(payout.periodStart)}</div>
                          <div className="text-xs text-muted-foreground">
                            to {formatDate(payout.periodEnd)}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-sm font-medium">
                        {formatCurrencyUtil(payout.netAmount * 100, currency)}
                      </td>
                      <td className="p-3">
                        <Badge variant={getStatusBadgeVariant(payout.status)}>
                          {payout.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {payout.processedAt
                          ? formatDate(payout.processedAt)
                          : "-"}
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(payout.id)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <PayoutDetailsModal
        payoutId={selectedPayoutId}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  )
}

