"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, User, Mail, Calendar, CreditCard } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

interface CustomerProfileModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface Subscription {
  id: string
  planId: string
  status: string
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  createdAt: string
  membership: {
    id: string
    title: string
    description: string
    monthlyRecurringFee: number
    coverImageUrl: string | null
  } | null
}

interface CustomerProfile {
  customer: {
    name: string
    email: string
  }
  subscriptions: Subscription[]
}

export function CustomerProfileModal({ open, onOpenChange }: CustomerProfileModalProps) {
  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      fetchProfile()
    } else {
      // Reset state when modal closes
      setProfile(null)
      setError(null)
    }
  }, [open])

  const fetchProfile = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/customer/profile")
      if (!response.ok) {
        if (response.status === 401) {
          setError("Please login to view your profile")
          return
        }
        throw new Error("Failed to fetch profile")
      }

      const text = await response.text()
      if (!text) {
        throw new Error("Empty response from server")
      }

      const data = JSON.parse(text)
      setProfile(data)
    } catch (err) {
      console.error("Error fetching customer profile:", err)
      setError(err instanceof Error ? err.message : "Failed to load profile")
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A"
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    } catch {
      return "Invalid date"
    }
  }

  const formatPrice = (paise: number) => {
    return `₹${(paise / 100).toFixed(2)}`
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "default"
      case "canceled":
      case "cancelled":
        return "destructive"
      case "past_due":
        return "secondary"
      default:
        return "outline"
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>My Profile</DialogTitle>
          <DialogDescription>
            View your customer information and active subscriptions
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading profile...</span>
          </div>
        ) : error ? (
          <div className="py-8 text-center">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        ) : profile ? (
          <div className="space-y-6">
            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">{profile.customer.email}</p>
                  </div>
                </div>
                {profile.customer.name && (
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Name</p>
                      <p className="text-sm text-muted-foreground">{profile.customer.name}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Subscriptions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Subscriptions
                </CardTitle>
                <CardDescription>
                  {profile.subscriptions.length === 0
                    ? "You don't have any subscriptions yet"
                    : `${profile.subscriptions.length} subscription${profile.subscriptions.length !== 1 ? "s" : ""}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {profile.subscriptions.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    <p>No subscriptions found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {profile.subscriptions.map((subscription, index) => (
                      <div key={subscription.id}>
                        {index > 0 && <Separator className="my-4" />}
                        <div className="space-y-3">
                          {subscription.membership ? (
                            <>
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-sm">
                                    {subscription.membership.title}
                                  </h4>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {subscription.membership.description}
                                  </p>
                                </div>
                                <Badge variant={getStatusBadgeVariant(subscription.status)}>
                                  {subscription.status}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p className="text-muted-foreground">Monthly Fee</p>
                                  <p className="font-medium">
                                    {formatPrice(subscription.membership.monthlyRecurringFee)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Status</p>
                                  <p className="font-medium capitalize">{subscription.status}</p>
                                </div>
                              </div>
                              {(subscription.currentPeriodStart ||
                                subscription.currentPeriodEnd) && (
                                <div className="space-y-2 text-sm">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <div className="flex-1">
                                      <p className="text-muted-foreground">Current Period</p>
                                      <p className="font-medium">
                                        {formatDate(subscription.currentPeriodStart)} -{" "}
                                        {formatDate(subscription.currentPeriodEnd)}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium">Unknown Membership</p>
                                <Badge variant={getStatusBadgeVariant(subscription.status)}>
                                  {subscription.status}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Plan ID: {subscription.planId}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

