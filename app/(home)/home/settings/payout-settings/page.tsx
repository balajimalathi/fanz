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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { SubHeading } from "@/components/ui/sub-heading"
import { Switch } from "@/components/ui/switch"
import { Save, Loader2 } from "lucide-react"
import toast from "react-hot-toast"
import { useCreatorCurrency } from "@/lib/hooks/use-creator-currency"
import { getCurrencySymbol } from "@/lib/currency/currency-utils"

interface PayoutSettings {
  minimumThreshold?: number
  automaticPayout?: boolean
}

export default function PayoutSettingsPage() {
  const { currency: creatorCurrency, loading: currencyLoading } = useCreatorCurrency()
  const [settings, setSettings] = useState<PayoutSettings>({
    minimumThreshold: 1000,
    automaticPayout: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const currency = currencyLoading ? "USD" : creatorCurrency
  const currencySymbol = getCurrencySymbol(currency)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/creator/payout-settings")
      if (!response.ok) {
        throw new Error("Failed to fetch payout settings")
      }
      const data = await response.json()
      setSettings(data.payoutSettings || { minimumThreshold: 1000, automaticPayout: false })
    } catch (error) {
      console.error("Error fetching payout settings:", error)
      toast.error("Failed to load payout settings")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (settings.minimumThreshold !== undefined && settings.minimumThreshold < 0) {
      toast.error("Minimum threshold cannot be negative")
      return
    }

    try {
      setSaving(true)
      const response = await fetch("/api/creator/payout-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to save payout settings")
      }

      toast.success("Payout settings saved successfully")
    } catch (error) {
      console.error("Error saving payout settings:", error)
      toast.error(
        error instanceof Error ? error.message : "Failed to save payout settings"
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
        title="Payout Settings"
        description="Configure your payout preferences and thresholds"
      />
      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Payout Preferences</CardTitle>
          <CardDescription>
            Manage how and when you receive payouts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Minimum Payout Threshold */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="minimumThreshold">Minimum Payout Threshold</Label>
                <p className="text-sm text-muted-foreground">
                  Minimum amount (in {currency}) that must accumulate before a payout can be
                  processed
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{currencySymbol}</span>
              <Input
                id="minimumThreshold"
                type="number"
                min="0"
                value={settings.minimumThreshold || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    minimumThreshold: e.target.value
                      ? parseFloat(e.target.value)
                      : undefined,
                  })
                }
                placeholder="1000"
                className="max-w-[200px]"
              />
            </div>
          </div>

          <Separator />

          {/* Automatic vs Manual Payout */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="automaticPayout">Automatic Payout</Label>
                <p className="text-sm text-muted-foreground">
                  When enabled, payouts will be processed automatically once the
                  minimum threshold is reached. When disabled, you'll need to
                  request payouts manually.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="automaticPayout"
                checked={settings.automaticPayout || false}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, automaticPayout: checked })
                }
              />
              <span className="text-sm font-medium">
                {settings.automaticPayout ? "Automatic" : "Manual"}
              </span>
            </div>
          </div>

          <Separator />

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

