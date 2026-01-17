"use client"

import { useState, useEffect } from "react"
import { Edit2, Save, Loader2, Coins } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface PricingData {
  dmTextPrice: number
  dmImagePrice: number
  dmVideoPrice: number
  audioCallPricePerMinute: number
  videoCallPricePerMinute: number
  liveStreamEntryPrice: number
}

export function PricingCard() {
  const [pricing, setPricing] = useState<PricingData | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

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
      // Initialize form with current values
      setDmTextPrice(data.dmTextPrice?.toString() || "0")
      setDmImagePrice(data.dmImagePrice?.toString() || "0")
      setDmVideoPrice(data.dmVideoPrice?.toString() || "0")
      setAudioCallPricePerMinute(data.audioCallPricePerMinute?.toString() || "0")
      setVideoCallPricePerMinute(data.videoCallPricePerMinute?.toString() || "0")
      setLiveStreamEntryPrice(data.liveStreamEntryPrice?.toString() || "0")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred"
      setError(errorMessage)
      setMessage({ type: "error", text: "Failed to load pricing" })
      setTimeout(() => setMessage(null), 5000)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
    // Reset form to current values
    if (pricing) {
      setDmTextPrice(pricing.dmTextPrice?.toString() || "0")
      setDmImagePrice(pricing.dmImagePrice?.toString() || "0")
      setDmVideoPrice(pricing.dmVideoPrice?.toString() || "0")
      setAudioCallPricePerMinute(pricing.audioCallPricePerMinute?.toString() || "0")
      setVideoCallPricePerMinute(pricing.videoCallPricePerMinute?.toString() || "0")
      setLiveStreamEntryPrice(pricing.liveStreamEntryPrice?.toString() || "0")
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    // Reset form to current values
    if (pricing) {
      setDmTextPrice(pricing.dmTextPrice?.toString() || "0")
      setDmImagePrice(pricing.dmImagePrice?.toString() || "0")
      setDmVideoPrice(pricing.dmVideoPrice?.toString() || "0")
      setAudioCallPricePerMinute(pricing.audioCallPricePerMinute?.toString() || "0")
      setVideoCallPricePerMinute(pricing.videoCallPricePerMinute?.toString() || "0")
      setLiveStreamEntryPrice(pricing.liveStreamEntryPrice?.toString() || "0")
    }
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      setError(null)

      const pricingData: Partial<PricingData> = {
        dmTextPrice: parseInt(dmTextPrice) || 0,
        dmImagePrice: parseInt(dmImagePrice) || 0,
        dmVideoPrice: parseInt(dmVideoPrice) || 0,
        audioCallPricePerMinute: parseInt(audioCallPricePerMinute) || 0,
        videoCallPricePerMinute: parseInt(videoCallPricePerMinute) || 0,
        liveStreamEntryPrice: parseInt(liveStreamEntryPrice) || 0,
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
              <div className="space-y-3 pl-4">
                <div className="space-y-2">
                  <Label htmlFor="dm-text-price">Text Message (coins)</Label>
                  <Input
                    id="dm-text-price"
                    type="number"
                    value={dmTextPrice}
                    onChange={(e) => setDmTextPrice(e.target.value)}
                    placeholder="0"
                    min="0"
                    step="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dm-image-price">Image Message (coins)</Label>
                  <Input
                    id="dm-image-price"
                    type="number"
                    value={dmImagePrice}
                    onChange={(e) => setDmImagePrice(e.target.value)}
                    placeholder="0"
                    min="0"
                    step="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dm-video-price">Video Message (coins)</Label>
                  <Input
                    id="dm-video-price"
                    type="number"
                    value={dmVideoPrice}
                    onChange={(e) => setDmVideoPrice(e.target.value)}
                    placeholder="0"
                    min="0"
                    step="1"
                  />
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
                    type="number"
                    value={audioCallPricePerMinute}
                    onChange={(e) => setAudioCallPricePerMinute(e.target.value)}
                    placeholder="0"
                    min="0"
                    step="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="video-call-price">Video Call (coins/min)</Label>
                  <Input
                    id="video-call-price"
                    type="number"
                    value={videoCallPricePerMinute}
                    onChange={(e) => setVideoCallPricePerMinute(e.target.value)}
                    placeholder="0"
                    min="0"
                    step="1"
                  />
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
                    type="number"
                    value={liveStreamEntryPrice}
                    onChange={(e) => setLiveStreamEntryPrice(e.target.value)}
                    placeholder="0"
                    min="0"
                    step="1"
                  />
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
