"use client"

import { useEffect, useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { SubHeading } from "@/components/ui/sub-heading"
import { Loader2 } from "lucide-react"
import toast from "react-hot-toast"
import { getCurrencySymbol } from "@/lib/currency/currency-utils"

export default function CurrencySettingsPage() {
  const [currency, setCurrency] = useState<string>("INR")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/creator/currency")
      if (!response.ok) {
        throw new Error("Failed to fetch currency settings")
      }
      const data = await response.json()
      setCurrency(data.currency || "INR")
    } catch (error) {
      console.error("Error fetching currency settings:", error)
      toast.error("Failed to load currency settings")
    } finally {
      setLoading(false)
    }
  }


  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SubHeading
        title="Currency Settings"
        description="Your currency is set to INR (Indian Rupee) for all pricing and payouts."
      />
      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Currency</CardTitle>
          <CardDescription>
            All prices and payouts are in INR (Indian Rupee). This is the currency you'll use when setting prices for your content, memberships, and services.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <div className="flex items-center gap-2 p-3 border rounded-md bg-muted">
              <span className="text-lg">{getCurrencySymbol("INR")}</span>
              <span className="font-medium">INR (Indian Rupee)</span>
            </div>
            <p className="text-sm text-muted-foreground">
              All transactions and payouts are processed in INR. Multicurrency support will be available in a future update.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

