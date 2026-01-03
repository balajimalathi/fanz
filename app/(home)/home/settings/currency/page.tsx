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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Save, Loader2 } from "lucide-react"
import toast from "react-hot-toast"
import { SUPPORTED_CURRENCIES } from "@/lib/currency/currency-config"
import { getCurrencySymbol } from "@/lib/currency/currency-utils"

export default function CurrencySettingsPage() {
  const [currency, setCurrency] = useState<string>("USD")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

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
      setCurrency(data.currency || "USD")
    } catch (error) {
      console.error("Error fetching currency settings:", error)
      toast.error("Failed to load currency settings")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const response = await fetch("/api/creator/currency", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ currency }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to save currency settings")
      }

      toast.success("Currency settings saved successfully")
    } catch (error) {
      console.error("Error saving currency settings:", error)
      toast.error(
        error instanceof Error ? error.message : "Failed to save currency settings"
      )
    } finally {
      setSaving(false)
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
        description="Set your currency for pricing and payouts. Payment gateways will automatically convert prices to your fans' local currencies."
      />
      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Currency</CardTitle>
          <CardDescription>
            This is the currency you'll use when setting prices for your content, memberships, and services.
            Fans will see prices converted to their local currency automatically when they make payments.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select
              value={currency}
              onValueChange={setCurrency}
              disabled={true}
            >
              <SelectTrigger id="currency" className="max-w-[300px]">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_CURRENCIES.map((curr) => (
                  <SelectItem key={curr} value={curr}>
                    <span className="flex items-center gap-2">
                      <span>{getCurrencySymbol(curr)}</span>
                      <span>{curr}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Your currency is set during onboarding and cannot be changed for now. 
              You'll set prices in this currency. Payment gateways will handle conversion to your fans' local currencies automatically.
              <br />
              <span className="text-xs italic">Note: Currency changes will be available in a future update.</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

