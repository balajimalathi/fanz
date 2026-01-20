"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { FulfillmentCountdown } from "./fulfillment-countdown"
import { CheckCircle2, Clock, XCircle, Loader2 } from "lucide-react"
import { formatCurrency } from "@/lib/utils/currency"
import { formatRelativeTime } from "@/lib/utils/date-formatting"

interface OrderCardProps {
  order: {
    id: string
    serviceName: string
    serviceDescription: string
    serviceType: string
    creatorName: string
    creatorUsername: string
    creatorImage: string | null
    status: string
    fulfillmentNotes: string | null
    customerFulfilledAt: string | null
    activatedAt: string | null
    deadlineDate: string | null
    isDeadlinePassed: boolean
    canFulfill: boolean
    amount: number
    currency: string
    createdAt: string
  }
  onFulfill?: (orderId: string) => Promise<void>
}

const statusConfig = {
  pending: { label: "Pending", icon: Clock, variant: "outline" as const, color: "text-yellow-600" },
  active: { label: "Active", icon: Clock, variant: "default" as const, color: "text-blue-600" },
  fulfilled: { label: "Fulfilled", icon: CheckCircle2, variant: "default" as const, color: "text-green-600" },
  cancelled: { label: "Cancelled", icon: XCircle, variant: "destructive" as const, color: "text-red-600" },
}

export function OrderCard({ order, onFulfill }: OrderCardProps) {
  const [isFulfilling, setIsFulfilling] = useState(false)
  const statusInfo = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.pending
  const StatusIcon = statusInfo.icon

  const handleFulfill = async () => {
    if (!onFulfill) return

    setIsFulfilling(true)
    try {
      await onFulfill(order.id)
    } catch (error) {
      console.error("Error fulfilling order:", error)
    } finally {
      setIsFulfilling(false)
    }
  }

  const formatServiceType = (type: string) => {
    return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            <Avatar className="h-10 w-10">
              <AvatarImage src={order.creatorImage || undefined} />
              <AvatarFallback>{order.creatorName.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg">{order.serviceName}</CardTitle>
              <p className="text-sm text-muted-foreground">
                by {order.creatorName}
                {order.creatorUsername && ` (@${order.creatorUsername})`}
              </p>
            </div>
          </div>
          <Badge variant={statusInfo.variant} className="flex items-center gap-1">
            <StatusIcon className="h-3 w-3" />
            {statusInfo.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Service Type</span>
          <Badge variant="outline">{formatServiceType(order.serviceType)}</Badge>
        </div>

        {order.serviceDescription && (
          <div>
            <p className="text-sm text-muted-foreground line-clamp-2">{order.serviceDescription}</p>
          </div>
        )}

        {order.fulfillmentNotes && (
          <div className="p-3 bg-muted rounded-md">
            <p className="text-sm font-medium mb-1">Fulfillment Notes:</p>
            <p className="text-sm text-muted-foreground">{order.fulfillmentNotes}</p>
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Amount</span>
          <span className="font-semibold">{formatCurrency(order.amount, order.currency)}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Order Date</span>
          <span>{formatRelativeTime(order.createdAt)}</span>
        </div>

        {order.activatedAt && order.status === "fulfilled" && !order.customerFulfilledAt && (
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Fulfillment Deadline</span>
              <FulfillmentCountdown
                deadlineDate={order.deadlineDate}
                isDeadlinePassed={order.isDeadlinePassed}
              />
            </div>
            {order.canFulfill && onFulfill && (
              <Button
                onClick={handleFulfill}
                disabled={isFulfilling || order.isDeadlinePassed}
                className="w-full"
                size="sm"
              >
                {isFulfilling ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Confirming...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Confirm Fulfillment
                  </>
                )}
              </Button>
            )}
            {order.isDeadlinePassed && (
              <p className="text-xs text-destructive">
                The deadline for confirming fulfillment has passed.
              </p>
            )}
          </div>
        )}

        {order.customerFulfilledAt && (
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground">
              Confirmed {formatRelativeTime(order.customerFulfilledAt)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
