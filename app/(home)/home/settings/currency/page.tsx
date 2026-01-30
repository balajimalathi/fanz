"use client"

import { useEffect, useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { SubHeading } from "@/components/ui/sub-heading"
import { Loader2, Lock } from "lucide-react"
import toast from "react-hot-toast"
import { getCurrencySymbol } from "@/lib/currency/currency-utils"
import { CURRENCY_METADATA, DEFAULT_CURRENCY } from "@/lib/currency/currency-config"

export default function CurrencySettingsPage() {
  const [currency, setCurrency] = useState<string>(DEFAULT_CURRENCY)
  const [readOnly, setReadOnly] = useState(true)
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
      setCurrency(data.currency || DEFAULT_CURRENCY)
      setReadOnly(data.readOnly ?? true)
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

  const currencyName =
    currency in CURRENCY_METADATA
      ? CURRENCY_METADATA[currency as keyof typeof CURRENCY_METADATA].name
      : currency

  return (
    <div className="space-y-6">
      <SubHeading
        title="Currency Settings"
        description={
          readOnly
            ? "Your currency was set during onboarding and cannot be changed."
            : `Your currency is set to ${currency} for all pricing and payouts.`
        }
      />
      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Currency
          </CardTitle>
          <CardDescription>
            {readOnly
              ? "This is the currency you selected during onboarding. All prices, memberships, and payouts use this currency. Currency cannot be changed after onboarding."
              : "This is the currency you'll use when setting prices for your content, memberships, and services."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            
            <div className="flex items-center gap-2 p-3 border rounded-md bg-muted">
              <span className="text-lg">{getCurrencySymbol(currency)}</span>
              <span className="font-medium">{currency} ({currencyName})</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {readOnly
                ? "All transactions and payouts are processed in this currency. This setting is locked after onboarding."
                : "All transactions and payouts will be processed in this currency."}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

