"use client"

import { useState, useEffect, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, ArrowLeft, ShoppingBag } from "lucide-react"
import { OrderCard } from "./order-card"

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
  activatedAt: string | null
  deadlineDate: string | null
  isDeadlinePassed: boolean
  canFulfill: boolean
  amount: number
  currency: string
  createdAt: string
}

interface FanOrdersModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  creatorId: string
  creatorName: string
}

export function FanOrdersModal({
  open,
  onOpenChange,
  creatorId,
  creatorName,
}: FanOrdersModalProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/customer/orders?creatorId=${creatorId}`)
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
    if (open) {
      fetchOrders()
    } else {
      // Reset state when modal closes
      setOrders([])
      setStatusFilter("all")
      setMessage(null)
    }
  }, [open, creatorId])

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

  const handleClose = () => {
    setOrders([])
    setStatusFilter("all")
    setMessage(null)
    onOpenChange(false)
  }

  // Track if close was initiated by back button
  const closeInitiatedByButton = useRef(false)

  // Prevent closing on mobile (outside click or ESC)
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      const isMobile = typeof window !== "undefined" && window.innerWidth < 768
      // On mobile, only allow closing via back button
      if (isMobile && !closeInitiatedByButton.current) {
        return
      }
      closeInitiatedByButton.current = false
      handleClose()
    }
  }

  const handleBackButtonClick = () => {
    closeInitiatedByButton.current = true
    handleClose()
  }

  // Prevent outside click on mobile
  const handleInteractOutside = (e: Event) => {
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768
    if (isMobile) {
      e.preventDefault()
    }
  }

  // Prevent ESC key on mobile
  const handleEscapeKeyDown = (e: KeyboardEvent) => {
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768
    if (isMobile) {
      e.preventDefault()
    }
  }

  const filteredOrders = orders.filter((order) => {
    if (statusFilter === "all") return true
    return order.status === statusFilter
  })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="w-full max-w-full md:max-w-6xl h-screen md:h-[90vh] p-0 gap-0 rounded-none md:rounded-lg max-h-screen md:max-h-[90vh] top-0 md:top-[50%] left-0 md:left-[50%] translate-x-0 md:translate-x-[-50%] translate-y-0 md:translate-y-[-50%] [&>button]:hidden md:[&>button]:block flex flex-col"
        onInteractOutside={handleInteractOutside}
        onEscapeKeyDown={handleEscapeKeyDown}
      >
        <DialogHeader className="p-3 md:p-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBackButtonClick}
                className="md:hidden h-8 w-8 shrink-0"
                aria-label="Go back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base md:text-lg truncate">My Orders</DialogTitle>
                <DialogDescription className="text-xs md:text-sm truncate">
                  Orders from {creatorName}
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ShoppingBag className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
              <p className="text-muted-foreground">
                You haven't placed any service orders from {creatorName} yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {message && (
                <div
                  className={`p-4 rounded-md ${
                    message.type === "success"
                      ? "bg-green-50 text-green-800 border border-green-200 dark:bg-green-950 dark:text-green-200 dark:border-green-800"
                      : "bg-red-50 text-red-800 border border-red-200 dark:bg-red-950 dark:text-red-200 dark:border-red-800"
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
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
