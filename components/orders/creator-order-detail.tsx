"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { FulfillmentCountdown } from "./fulfillment-countdown"
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  Play,
  Package,
  User,
  Mail,
  Calendar
} from "lucide-react"
import { formatCurrency } from "@/lib/utils/currency"
import { formatRelativeTime, formatDateTimeLocal, formatDateLocal } from "@/lib/utils/date-formatting"

interface Order {
  id: string
  serviceId: string
  serviceName: string
  serviceDescription: string
  serviceType: string
  userId: string
  userName: string
  userEmail: string
  status: string
  fulfillmentNotes: string | null
  activatedAt: string | null
  utilizedAt: string | null
  customerJoinedAt: string | null
  creatorJoinedAt: string | null
  customerFulfilledAt: string | null
  deadlineDate: string | null
  isDeadlinePassed: boolean
  waitingForFanConfirmation: boolean
  amount: number
  createdAt: string
  updatedAt: string
}

interface CreatorOrderDetailProps {
  initialOrder: Order
}

const statusConfig = {
  pending: { label: "Pending", icon: Clock, variant: "outline" as const, color: "text-yellow-600" },
  active: { label: "Active", icon: Play, variant: "default" as const, color: "text-blue-600" },
  fulfilled: { label: "Fulfilled", icon: CheckCircle2, variant: "default" as const, color: "text-green-600" },
  cancelled: { label: "Cancelled", icon: XCircle, variant: "destructive" as const, color: "text-red-600" },
}

export function CreatorOrderDetail({ initialOrder }: CreatorOrderDetailProps) {
  const router = useRouter()
  const [order, setOrder] = useState<Order>(initialOrder)
  const [loading, setLoading] = useState(false)
  const [fulfillmentNotes, setFulfillmentNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const fetchOrder = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/creator/orders/${order.id}`)
      if (!response.ok) {
        throw new Error("Failed to fetch order")
      }
      const data = await response.json()
      setOrder(data)
      setFulfillmentNotes(data.fulfillmentNotes || "")
    } catch (error) {
      console.error("Error fetching order:", error)
      setMessage({ type: "error", text: "Failed to load order details" })
      setTimeout(() => setMessage(null), 5000)
    } finally {
      setLoading(false)
    }
  }

  const handleActivate = async () => {
    try {
      setIsSubmitting(true)
      const response = await fetch(`/api/creator/orders/${order.id}/activate`, {
        method: "PATCH",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to activate order")
      }

      setMessage({ type: "success", text: "Order activated successfully!" })
      setTimeout(() => setMessage(null), 5000)
      await fetchOrder()
    } catch (error) {
      console.error("Error activating order:", error)
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to activate order",
      })
      setTimeout(() => setMessage(null), 5000)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMarkFulfilled = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsSubmitting(true)
      const response = await fetch(`/api/creator/orders/${order.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "fulfilled",
          fulfillmentNotes: fulfillmentNotes || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to mark order as fulfilled")
      }

      setMessage({ type: "success", text: "Order marked as fulfilled!" })
      setTimeout(() => setMessage(null), 5000)
      await fetchOrder()
    } catch (error) {
      console.error("Error fulfilling order:", error)
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to mark order as fulfilled",
      })
      setTimeout(() => setMessage(null), 5000)
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatServiceType = (type: string) => {
    return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
  }

  const statusInfo = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.pending
  const StatusIcon = statusInfo.icon

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/home/orders">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Orders
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Order Details</h1>
          <p className="text-muted-foreground">Order ID: {order.id}</p>
        </div>
        <Badge variant={statusInfo.variant} className="flex items-center gap-1 text-sm px-3 py-1">
          <StatusIcon className="h-4 w-4" />
          {order.status === "fulfilled" && order.waitingForFanConfirmation
            ? "Waiting for Fan"
            : statusInfo.label}
        </Badge>
      </div>

      {message && (
        <div
          className={`p-4 rounded-md ${message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
            }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Order Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Service Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Service Name</Label>
              <p className="font-semibold text-lg">{order.serviceName}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Service Type</Label>
               <p className="font-semibold text-lg">{formatServiceType(order.serviceType)}</p>
            </div>
            {order.serviceDescription && (
              <div>
                <Label className="text-muted-foreground">Description</Label>
                <p className="font-semibold text-lg">{order.serviceDescription}</p>
              </div>
            )}
            <div>
              <Label className="text-muted-foreground">Amount</Label>
              <p className="font-semibold text-lg text-green-400">
                {formatCurrency(order.amount, "INR")}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground flex items-center gap-2">
                <User className="h-4 w-4" />
                Name
              </Label>
              <p className="font-semibold mt-1">{order.userName}</p>
            </div>
            <div>
              <Label className="text-muted-foreground flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <p className="text-sm mt-1">{order.userEmail}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Order Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Order Created</span>
            <span className="text-sm">
              {formatRelativeTime(order.createdAt)}
            </span>
          </div>
          {order.activatedAt && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Order Activated</span>
              <span className="text-sm">
                {formatRelativeTime(order.activatedAt)}
              </span>
            </div>
          )}
          {order.status === "fulfilled" && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Marked as Fulfilled</span>
              <span className="text-sm">
                {formatRelativeTime(order.updatedAt)}
              </span>
            </div>
          )}
          {order.customerFulfilledAt && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Fan Confirmed</span>
              <span className="text-sm text-green-600 font-medium">
                {formatRelativeTime(order.customerFulfilledAt)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fulfillment Status */}
      {order.status === "fulfilled" && (
        <Card>
          <CardHeader>
            <CardTitle>Fulfillment Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {order.fulfillmentNotes && (
              <div>
                <Label className="text-muted-foreground">Fulfillment Notes</Label>
                <div className="p-3 bg-muted rounded-md mt-2">
                  <p className="text-sm">{order.fulfillmentNotes}</p>
                </div>
              </div>
            )}
            {order.waitingForFanConfirmation && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Fulfillment Deadline</Label>
                  <FulfillmentCountdown
                    deadlineDate={order.deadlineDate}
                    isDeadlinePassed={order.isDeadlinePassed}
                  />
                </div>
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
                  <p className="text-sm text-orange-800">
                    ⏳ Waiting for fan to confirm fulfillment
                    {order.deadlineDate && !order.isDeadlinePassed && (
                      <span className="block text-xs mt-1">
                        Deadline: {formatDateTimeLocal(order.deadlineDate)}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}
            {order.customerFulfilledAt && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800">
                  ✓ Confirmed by fan on {formatDateLocal(order.customerFulfilledAt)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent>
          {order.status === "pending" && (
            <Button onClick={handleActivate} disabled={isSubmitting} className="w-full">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Activating...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Activate Order
                </>
              )}
            </Button>
          )}

          {order.status === "active" && (
            <form onSubmit={handleMarkFulfilled} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fulfillment-notes">Fulfillment Notes (Optional)</Label>
                <Textarea
                  id="fulfillment-notes"
                  value={fulfillmentNotes}
                  onChange={(e) => setFulfillmentNotes(e.target.value)}
                  placeholder="Add any notes about how you fulfilled this order..."
                  rows={4}
                />
              </div>
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Marking as Fulfilled...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Mark as Fulfilled
                  </>
                )}
              </Button>
            </form>
          )}

          {order.status === "fulfilled" && !order.waitingForFanConfirmation && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">
                Order completed. Fan has confirmed fulfillment.
              </p>
            </div>
          )}

          {order.status === "cancelled" && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">This order has been cancelled.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
