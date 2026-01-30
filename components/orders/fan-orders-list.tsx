"use client"

import { useState, useEffect } from "react"
import { OrderCard } from "./order-card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, ShoppingBag } from "lucide-react"

interface Order {
  id: string
  serviceName: string
  serviceDescription: string
  serviceType: string
  creatorName: string
  creatorUsername: string
  creatorImage: string | null
  status: string
  fulfillmentNotes: string | null
  fulfillmentMediaUrl: string | null
  customerFulfilledAt: string | null
  creatorFulfilledAt: string | null
  activatedAt: string | null
  deadlineDate: string | null
  isDeadlinePassed: boolean
  canFulfill: boolean
  amount: number
  currency: string
  createdAt: string
}

export function FanOrdersList() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/customer/orders")
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

  const handleFulfill = async (orderId: string) => {
    try {
      const response = await fetch(`/api/customer/orders/${orderId}/fulfill`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to confirm fulfillment")
      }

      setMessage({ type: "success", text: "Order fulfillment confirmed successfully!" })
      setTimeout(() => setMessage(null), 5000)

      // Refresh orders
      await fetchOrders()
    } catch (error) {
      console.error("Error confirming fulfillment:", error)
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to confirm fulfillment",
      })
      setTimeout(() => setMessage(null), 5000)
      throw error
    }
  }

  const filteredOrders = orders.filter((order) => {
    if (statusFilter === "all") return true
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
          You haven't placed any service orders yet.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {message && (
        <div
          className={`p-4 rounded-md ${
            message.type === "success"
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
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="fulfilled">Fulfilled</SelectItem>
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
          <OrderCard key={order.id} order={order} onFulfill={handleFulfill} />
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
