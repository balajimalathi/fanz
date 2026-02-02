"use client"

import { useState, useEffect } from "react"
import { Edit2, Save, Loader2, Coins } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const COIN_PRICE_MIN = 1
const COIN_PRICE_MAX = 10000
const COIN_PRICE_MAX_DIGITS = 5

function validateCoinPrice(value: string): { valid: boolean; error?: string } {
  const trimmed = value.trim()
  if (!trimmed) {
    return { valid: false, error: "Required" }
  }
  if (trimmed.length > COIN_PRICE_MAX_DIGITS) {
    return { valid: false, error: `Max ${COIN_PRICE_MAX_DIGITS} digits` }
  }
  const num = parseInt(trimmed, 10)
  if (Number.isNaN(num)) {
    return { valid: false, error: "Must be a number" }
  }
  if (num < COIN_PRICE_MIN) {
    return { valid: false, error: `Min ${COIN_PRICE_MIN} (cannot be 0)` }
  }
  if (num > COIN_PRICE_MAX) {
    return { valid: false, error: `Max ${COIN_PRICE_MAX}` }
  }
  return { valid: true }
}

function sanitizeCoinInput(value: string): string {
  const digits = value.replace(/\D/g, "")
  return digits.slice(0, COIN_PRICE_MAX_DIGITS)
}

interface PricingData {
  dmTextPrice: number
  dmImagePrice: number
  dmVideoPrice: number
  audioCallPricePerMinute: number
  videoCallPricePerMinute: number
  liveStreamEntryPrice: number
}

type PricingFieldKey = keyof PricingData

export function PricingCard() {
  const [pricing, setPricing] = useState<PricingData | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<PricingFieldKey, string>>>({})

  // Form state
  const [dmTextPrice, setDmTextPrice] = useState("0")
  const [dmImagePrice, setDmImagePrice] = useState("0")
  const [dmVideoPrice, setDmVideoPrice] = useState("0")
  const [audioCallPricePerMinute, setAudioCallPricePerMinute] = useState("0")
  const [videoCallPricePerMinute, setVideoCallPricePerMinute] = useState("0")
  const [liveStreamEntryPrice, setLiveStreamEntryPrice] = useState("0")

  // Fetch pricing on mount
  useEffect(() => {
    fetchPricing()
  }, [])

  const fetchPricing = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch("/api/creator/pricing")
      if (!response.ok) {
        throw new Error("Failed to fetch pricing")
      }
      const data = await response.json()
      setPricing(data)
      setDmTextPrice(toValidDefault(data.dmTextPrice))
      setDmImagePrice(toValidDefault(data.dmImagePrice))
      setDmVideoPrice(toValidDefault(data.dmVideoPrice))
      setAudioCallPricePerMinute(toValidDefault(data.audioCallPricePerMinute))
      setVideoCallPricePerMinute(toValidDefault(data.videoCallPricePerMinute))
      setLiveStreamEntryPrice(toValidDefault(data.liveStreamEntryPrice))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred"
      setError(errorMessage)
      setMessage({ type: "error", text: "Failed to load pricing" })
      setTimeout(() => setMessage(null), 5000)
    } finally {
      setIsLoading(false)
    }
  }

  const toValidDefault = (n: number | undefined) => {
    const v = n?.toString() ?? "0"
    const num = parseInt(v, 10)
    return (Number.isNaN(num) || num < COIN_PRICE_MIN) ? String(COIN_PRICE_MIN) : v
  }

  const handleEdit = () => {
    setIsEditing(true)
    setFieldErrors({})
    if (pricing) {
      setDmTextPrice(toValidDefault(pricing.dmTextPrice))
      setDmImagePrice(toValidDefault(pricing.dmImagePrice))
      setDmVideoPrice(toValidDefault(pricing.dmVideoPrice))
      setAudioCallPricePerMinute(toValidDefault(pricing.audioCallPricePerMinute))
      setVideoCallPricePerMinute(toValidDefault(pricing.videoCallPricePerMinute))
      setLiveStreamEntryPrice(toValidDefault(pricing.liveStreamEntryPrice))
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setFieldErrors({})
    if (pricing) {
      setDmTextPrice(toValidDefault(pricing.dmTextPrice))
      setDmImagePrice(toValidDefault(pricing.dmImagePrice))
      setDmVideoPrice(toValidDefault(pricing.dmVideoPrice))
      setAudioCallPricePerMinute(toValidDefault(pricing.audioCallPricePerMinute))
      setVideoCallPricePerMinute(toValidDefault(pricing.videoCallPricePerMinute))
      setLiveStreamEntryPrice(toValidDefault(pricing.liveStreamEntryPrice))
    }
  }

  const handleSave = async () => {
    const values = [
      dmTextPrice,
      dmImagePrice,
      dmVideoPrice,
      audioCallPricePerMinute,
      videoCallPricePerMinute,
      liveStreamEntryPrice,
    ] as const
    const keys: PricingFieldKey[] = [
      "dmTextPrice",
      "dmImagePrice",
      "dmVideoPrice",
      "audioCallPricePerMinute",
      "videoCallPricePerMinute",
      "liveStreamEntryPrice",
    ]
    const errors: Partial<Record<PricingFieldKey, string>> = {}
    keys.forEach((key, i) => {
      const result = validateCoinPrice(values[i])
      if (!result.valid) errors[key] = result.error
    })
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setMessage({ type: "error", text: "Fix the errors below. Min 1, max 10000, max 5 digits." })
      setTimeout(() => setMessage(null), 5000)
      return
    }
    setFieldErrors({})

    try {
      setIsSaving(true)
      setError(null)

      const pricingData: Partial<PricingData> = {
        dmTextPrice: parseInt(dmTextPrice, 10),
        dmImagePrice: parseInt(dmImagePrice, 10),
        dmVideoPrice: parseInt(dmVideoPrice, 10),
        audioCallPricePerMinute: parseInt(audioCallPricePerMinute, 10),
        videoCallPricePerMinute: parseInt(videoCallPricePerMinute, 10),
        liveStreamEntryPrice: parseInt(liveStreamEntryPrice, 10),
      }

      const response = await fetch("/api/creator/pricing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(pricingData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update pricing")
      }

      const updatedPricing = await response.json()
      setPricing(updatedPricing)
      setIsEditing(false)
      setMessage({ type: "success", text: "Pricing updated successfully" })
      setTimeout(() => setMessage(null), 5000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred"
      setError(errorMessage)
      setMessage({ type: "error", text: errorMessage })
      setTimeout(() => setMessage(null), 5000)
    } finally {
      setIsSaving(false)
    }
  }

  if (isEditing) {
    return (
      <Card className="border-2 border-primary">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold text-primary">Coin Pricing</h2>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {message && (
            <div
              className={cn(
                "rounded-md p-3 text-sm",
                message.type === "success"
                  ? "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200 border border-green-200 dark:border-green-800"
                  : "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200 border border-red-200 dark:border-red-800"
              )}
            >
              {message.text}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-3">Direct Messages (per message)</h3>
              <p className="text-xs text-muted-foreground mb-2">Min {COIN_PRICE_MIN}, max {COIN_PRICE_MAX} coins (max {COIN_PRICE_MAX_DIGITS} digits). Cannot be 0.</p>
              <div className="space-y-3 pl-4">
                <div className="space-y-2">
                  <Label htmlFor="dm-text-price">Text Message (coins)</Label>
                  <Input
                    id="dm-text-price"
                    type="text"
                    inputMode="numeric"
                    value={dmTextPrice}
                    onChange={(e) => {
                      setFieldErrors((prev) => ({ ...prev, dmTextPrice: undefined }))
                      setDmTextPrice(sanitizeCoinInput(e.target.value))
                    }}
                    placeholder="1"
                    maxLength={COIN_PRICE_MAX_DIGITS}
                    className={cn(fieldErrors.dmTextPrice && "border-destructive")}
                  />
                  {fieldErrors.dmTextPrice && (
                    <p className="text-sm text-destructive">{fieldErrors.dmTextPrice}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dm-image-price">Image Message (coins)</Label>
                  <Input
                    id="dm-image-price"
                    type="text"
                    inputMode="numeric"
                    value={dmImagePrice}
                    onChange={(e) => {
                      setFieldErrors((prev) => ({ ...prev, dmImagePrice: undefined }))
                      setDmImagePrice(sanitizeCoinInput(e.target.value))
                    }}
                    placeholder="1"
                    maxLength={COIN_PRICE_MAX_DIGITS}
                    className={cn(fieldErrors.dmImagePrice && "border-destructive")}
                  />
                  {fieldErrors.dmImagePrice && (
                    <p className="text-sm text-destructive">{fieldErrors.dmImagePrice}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dm-video-price">Video Message (coins)</Label>
                  <Input
                    id="dm-video-price"
                    type="text"
                    inputMode="numeric"
                    value={dmVideoPrice}
                    onChange={(e) => {
                      setFieldErrors((prev) => ({ ...prev, dmVideoPrice: undefined }))
                      setDmVideoPrice(sanitizeCoinInput(e.target.value))
                    }}
                    placeholder="1"
                    maxLength={COIN_PRICE_MAX_DIGITS}
                    className={cn(fieldErrors.dmVideoPrice && "border-destructive")}
                  />
                  {fieldErrors.dmVideoPrice && (
                    <p className="text-sm text-destructive">{fieldErrors.dmVideoPrice}</p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-3">Calls (per minute)</h3>
              <div className="space-y-3 pl-4">
                <div className="space-y-2">
                  <Label htmlFor="audio-call-price">Audio Call (coins/min)</Label>
                  <Input
                    id="audio-call-price"
                    type="text"
                    inputMode="numeric"
                    value={audioCallPricePerMinute}
                    onChange={(e) => {
                      setFieldErrors((prev) => ({ ...prev, audioCallPricePerMinute: undefined }))
                      setAudioCallPricePerMinute(sanitizeCoinInput(e.target.value))
                    }}
                    placeholder="1"
                    maxLength={COIN_PRICE_MAX_DIGITS}
                    className={cn(fieldErrors.audioCallPricePerMinute && "border-destructive")}
                  />
                  {fieldErrors.audioCallPricePerMinute && (
                    <p className="text-sm text-destructive">{fieldErrors.audioCallPricePerMinute}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="video-call-price">Video Call (coins/min)</Label>
                  <Input
                    id="video-call-price"
                    type="text"
                    inputMode="numeric"
                    value={videoCallPricePerMinute}
                    onChange={(e) => {
                      setFieldErrors((prev) => ({ ...prev, videoCallPricePerMinute: undefined }))
                      setVideoCallPricePerMinute(sanitizeCoinInput(e.target.value))
                    }}
                    placeholder="1"
                    maxLength={COIN_PRICE_MAX_DIGITS}
                    className={cn(fieldErrors.videoCallPricePerMinute && "border-destructive")}
                  />
                  {fieldErrors.videoCallPricePerMinute && (
                    <p className="text-sm text-destructive">{fieldErrors.videoCallPricePerMinute}</p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-3">Live Streaming</h3>
              <div className="space-y-3 pl-4">
                <div className="space-y-2">
                  <Label htmlFor="live-stream-price">Entry Price (coins, one-time)</Label>
                  <Input
                    id="live-stream-price"
                    type="text"
                    inputMode="numeric"
                    value={liveStreamEntryPrice}
                    onChange={(e) => {
                      setFieldErrors((prev) => ({ ...prev, liveStreamEntryPrice: undefined }))
                      setLiveStreamEntryPrice(sanitizeCoinInput(e.target.value))
                    }}
                    placeholder="1"
                    maxLength={COIN_PRICE_MAX_DIGITS}
                    className={cn(fieldErrors.liveStreamEntryPrice && "border-destructive")}
                  />
                  {fieldErrors.liveStreamEntryPrice && (
                    <p className="text-sm text-destructive">{fieldErrors.liveStreamEntryPrice}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} size="sm" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Pricing
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-2">
          <Coins className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold text-primary">Coin Pricing</h2>
        </div>
        <Button onClick={handleEdit} size="sm" disabled={isLoading}>
          <Edit2 className="h-4 w-4 mr-2" />
          Edit Pricing
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {message && (
          <div
            className={cn(
              "rounded-md p-3 text-sm",
              message.type === "success"
                ? "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200 border border-green-200 dark:border-green-800"
                : "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200 border border-red-200 dark:border-red-800"
            )}
          >
            {message.text}
          </div>
        )}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            <p>Loading pricing...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-destructive">
            <p>{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchPricing}
              className="mt-4"
            >
              Retry
            </Button>
          </div>
        ) : pricing ? (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-2 text-muted-foreground">Direct Messages (per message)</h3>
              <div className="space-y-2 pl-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Text Message</span>
                  <span className="font-medium text-primary">
                    {pricing.dmTextPrice} <Coins className="h-4 w-4 inline" />
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Image Message</span>
                  <span className="font-medium text-primary">
                    {pricing.dmImagePrice} <Coins className="h-4 w-4 inline" />
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Video Message</span>
                  <span className="font-medium text-primary">
                    {pricing.dmVideoPrice} <Coins className="h-4 w-4 inline" />
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-2 text-muted-foreground">Calls (per minute)</h3>
              <div className="space-y-2 pl-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Audio Call</span>
                  <span className="font-medium text-primary">
                    {pricing.audioCallPricePerMinute} <Coins className="h-4 w-4 inline" />/min
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Video Call</span>
                  <span className="font-medium text-primary">
                    {pricing.videoCallPricePerMinute} <Coins className="h-4 w-4 inline" />/min
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-2 text-muted-foreground">Live Streaming</h3>
              <div className="space-y-2 pl-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Entry Price</span>
                  <span className="font-medium text-primary">
                    {pricing.liveStreamEntryPrice} <Coins className="h-4 w-4 inline" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
