"use client"

import { useState, useEffect } from "react"
import { OrderCard } from "./order-card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, MoveUpRight, ShoppingBag } from "lucide-react"
import Link from "next/link"
import { formatDateLocal } from "@/lib/utils/date-formatting"
import { formatCurrency } from "@/lib/currency/currency-utils"

interface Order {
  id: string
  serviceName: string
  serviceDescription: string
  serviceType: string
  userName: string
  userEmail: string
  status: string
  fulfillmentNotes: string | null
  activatedAt: string | null
  customerFulfilledAt: string | null
  creatorFulfilledAt: string | null
  deadlineDate: string | null
  isDeadlinePassed: boolean
  waitingForFanConfirmation: boolean
  amount: number // in subunits
  currency: string
  createdAt: string
}

export function CreatorOrdersList() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/creator/orders")
      if (!response.ok) {
        throw new Error("Failed to fetch orders")
      }
      const data = await response.json()
      setOrders(data.orders || [])
    } catch (error) {
      console.error("Error fetching orders:", error)
      setMessage({ type: "error", text: "Failed to load orders. Please try again." })
      setTimeout(() => setMessage(null), 5000)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  const filteredOrders = orders.filter((order) => {
    if (statusFilter === "all") return true
    if (statusFilter === "waiting_confirmation") {
      return order.waitingForFanConfirmation
    }
    return order.status === statusFilter
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <ShoppingBag className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
        <p className="text-muted-foreground">
          You haven't received any service orders yet.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="fulfilled">Fulfilled</SelectItem>
              <SelectItem value="waiting_confirmation">Waiting for Fan</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={fetchOrders}>
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredOrders.map((order) => (
          <CreatorOrderCard key={order.id} order={order} />
        ))}
      </div>

      {filteredOrders.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No orders found with the selected filter.
        </div>
      )}
    </div>
  )
}

function CreatorOrderCard({ order }: { order: Order }) {
  const formatServiceType = (type: string) => {
    return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
  }

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{order.serviceName}</h3>
          <p className="text-sm text-muted-foreground">
            {order.userName} ({order.userEmail})
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className={`text-xs px-2 py-1 rounded ${order.status === "pending"
              ? "bg-yellow-100 text-yellow-800"
              : order.status === "active"
                ? "bg-blue-100 text-blue-800"
                : order.status === "fulfilled"
                  ? order.waitingForFanConfirmation
                    ? "bg-orange-100 text-orange-800"
                    : "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
          >
            {order.status === "fulfilled" && order.waitingForFanConfirmation
              ? "Waiting for Fan"
              : order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </span>
        </div>
      </div>
      {order.serviceDescription && (
        <p className="text-sm text-muted-foreground line-clamp-2">{order.serviceDescription}</p>
      )}


      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Service Type</span>
          <span className="font-medium">{formatServiceType(order.serviceType)}</span>
        </div>
        <div className="flex flex-col items-end gap-1 text-sm">
          <span className="text-muted-foreground">Amount</span>
          <span className="font-semibold">{formatCurrency(order.amount, order.currency)}</span>
        </div>
      </div>


      {order.fulfillmentNotes && (
        <div className="p-2 bg-muted rounded text-sm">
          <p className="font-medium mb-1">Notes</p>
          <p className="text-muted-foreground">{order.fulfillmentNotes}</p>
        </div>
      )}



      {order.waitingForFanConfirmation && (
        <div className="p-2 bg-orange-50 border border-orange-200 rounded text-sm">
          <p className="text-orange-800">
            ⏳ Waiting for fan to confirm fulfillment
            {order.deadlineDate && !order.isDeadlinePassed && (
              <span className="block text-xs mt-1">
                Deadline: {new Date(order.deadlineDate).toLocaleString()}
              </span>
            )}
          </p>
        </div>
      )}

      {order.customerFulfilledAt && (
        <div className="p-2 bg-green-50 border border-green-200 rounded text-sm">
          <p className="text-green-800">
            ✓ Confirmed by fan on {formatDateLocal(order.customerFulfilledAt)}
          </p>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Link href={`/home/orders/${order.id}`} className="flex-1">
          <Button variant="outline" size="sm" className="w-full">
            View Details <MoveUpRight className="h-2 w-2" />
          </Button>
        </Link>
      </div>
    </div>
  )
}
