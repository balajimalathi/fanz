"use client"

import { useState, useEffect, useRef } from "react"
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
  Calendar,
  Upload,
  X,
  FileVideo,
  Image as ImageIcon
} from "lucide-react"
import { formatCurrency } from "@/lib/currency/currency-utils"
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
  customerDescription: string | null
  fulfillmentNotes: string | null
  fulfillmentMediaUrl: string | null
  activatedAt: string | null
  utilizedAt: string | null
  customerJoinedAt: string | null
  creatorJoinedAt: string | null
  customerFulfilledAt: string | null
  deadlineDate: string | null
  isDeadlinePassed: boolean
  waitingForFanConfirmation: boolean
  amount: number
  currency: string
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      setSelectedFile(null) // Reset selected file when order is fetched
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const serviceType = order.serviceType
    if (serviceType === "custom_video") {
      if (!file.type.startsWith("video/")) {
        setMessage({ type: "error", text: "Please select a video file" })
        setTimeout(() => setMessage(null), 5000)
        return
      }
      if (file.size > 500 * 1024 * 1024) {
        setMessage({ type: "error", text: "Video file size must be less than 500MB" })
        setTimeout(() => setMessage(null), 5000)
        return
      }
    } else if (serviceType === "custom_photo") {
      if (!file.type.startsWith("image/")) {
        setMessage({ type: "error", text: "Please select an image file" })
        setTimeout(() => setMessage(null), 5000)
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        setMessage({ type: "error", text: "Image file size must be less than 10MB" })
        setTimeout(() => setMessage(null), 5000)
        return
      }
    }

    setSelectedFile(file)
  }

  const handleFileUpload = async () => {
    if (!selectedFile) return

    try {
      setUploadingFile(true)
      const formData = new FormData()
      formData.append("file", selectedFile)

      const response = await fetch(`/api/creator/orders/${order.id}/fulfillment-media`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to upload file")
      }

      const data = await response.json()
      setMessage({ type: "success", text: "File uploaded successfully!" })
      setTimeout(() => setMessage(null), 5000)
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      await fetchOrder()
    } catch (error) {
      console.error("Error uploading file:", error)
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to upload file",
      })
      setTimeout(() => setMessage(null), 5000)
    } finally {
      setUploadingFile(false)
    }
  }

  const handleMarkFulfilled = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check if file is required but not uploaded
    const requiresFile = order.serviceType === "custom_video" || order.serviceType === "custom_photo"
    if (requiresFile && !order.fulfillmentMediaUrl && !selectedFile) {
      setMessage({
        type: "error",
        text: "Please upload the fulfillment file before marking as fulfilled",
      })
      setTimeout(() => setMessage(null), 5000)
      return
    }

    // If file is selected but not uploaded, upload it first
    if (selectedFile && !order.fulfillmentMediaUrl) {
      await handleFileUpload()
      // Wait a bit for the order to update
      await new Promise(resolve => setTimeout(resolve, 500))
      await fetchOrder()
    }

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
                {formatCurrency(order.amount, order.currency)}
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

      {/* Customer Requirements */}
      {order.customerDescription && (
        <Card>
          <CardHeader>
            <CardTitle>Customer Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm whitespace-pre-wrap">{order.customerDescription}</p>
            </div>
          </CardContent>
        </Card>
      )}

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
            {order.fulfillmentMediaUrl && (
              <div>
                <Label className="text-muted-foreground">Fulfillment Media</Label>
                <div className="p-3 bg-muted rounded-md mt-2">
                  <a
                    href={order.fulfillmentMediaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-2"
                  >
                    {order.serviceType === "custom_video" ? (
                      <FileVideo className="h-4 w-4" />
                    ) : (
                      <ImageIcon className="h-4 w-4" />
                    )}
                    View {order.serviceType === "custom_video" ? "Video" : "Image"}
                  </a>
                </div>
              </div>
            )}
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
              {/* File Upload for custom_video and custom_photo */}
              {(order.serviceType === "custom_video" || order.serviceType === "custom_photo") && (
                <div className="space-y-2">
                  <Label>
                    Fulfillment File {order.serviceType === "custom_video" ? "(Video)" : "(Image)"} *
                  </Label>
                  <p className="text-xs text-muted-foreground">For more files, please zip the files and upload the zip file.</p>
                  {order.fulfillmentMediaUrl ? (
                    <div className="space-y-2">
                      <div className="p-3 bg-muted rounded-md flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {order.serviceType === "custom_video" ? (
                            <FileVideo className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ImageIcon className="h-5 w-5 text-muted-foreground" />
                          )}
                          <span className="text-sm">File uploaded successfully</span>
                        </div>
                        <a
                          href={order.fulfillmentMediaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          View
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={order.serviceType === "custom_video" ? "video/*" : "image/*"}
                        onChange={handleFileSelect}
                        className="hidden"
                        disabled={uploadingFile}
                      />
                      {selectedFile ? (
                        <div className="p-3 bg-muted rounded-md flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {order.serviceType === "custom_video" ? (
                              <FileVideo className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ImageIcon className="h-5 w-5 text-muted-foreground" />
                            )}
                            <span className="text-sm">{selectedFile.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={handleFileUpload}
                              disabled={uploadingFile}
                            >
                              {uploadingFile ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Uploading...
                                </>
                              ) : (
                                <>
                                  <Upload className="h-4 w-4 mr-2" />
                                  Upload
                                </>
                              )}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedFile(null)
                                if (fileInputRef.current) {
                                  fileInputRef.current.value = ""
                                }
                              }}
                              disabled={uploadingFile}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingFile}
                          className="w-full"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Select {order.serviceType === "custom_video" ? "Video" : "Image"} File
                        </Button>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {order.serviceType === "custom_video"
                          ? "Maximum file size: 500MB"
                          : "Maximum file size: 10MB"}
                      </p>
                    </div>
                  )}
                </div>
              )}
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
              <Button type="submit" disabled={isSubmitting || uploadingFile} className="w-full">
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
