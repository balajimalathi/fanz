"use client"

import { useState, useEffect } from "react"
import { Settings, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import toast from "react-hot-toast"
import { AvailabilityScheduleEditor } from "./availability-schedule-editor"
import type { AvailabilitySchedule } from "@/lib/services/timezone-service"

export function FeatureSettingsCard() {
  const [chatEnabled, setChatEnabled] = useState(true)
  const [callEnabled, setCallEnabled] = useState(true)
  const [chatAvailabilitySchedule, setChatAvailabilitySchedule] =
    useState<AvailabilitySchedule | null>(null)
  const [callAvailabilitySchedule, setCallAvailabilitySchedule] =
    useState<AvailabilitySchedule | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [originalSettings, setOriginalSettings] = useState<{
    chatEnabled: boolean
    callEnabled: boolean
    chatAvailabilitySchedule: AvailabilitySchedule | null
    callAvailabilitySchedule: AvailabilitySchedule | null
  } | null>(null)

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings()
  }, [])

  // Check for changes
  useEffect(() => {
    if (originalSettings) {
      const changed =
        chatEnabled !== originalSettings.chatEnabled ||
        callEnabled !== originalSettings.callEnabled ||
        JSON.stringify(chatAvailabilitySchedule) !==
        JSON.stringify(originalSettings.chatAvailabilitySchedule) ||
        JSON.stringify(callAvailabilitySchedule) !==
        JSON.stringify(originalSettings.callAvailabilitySchedule)
      setHasChanges(changed)
    }
  }, [
    chatEnabled,
    callEnabled,
    chatAvailabilitySchedule,
    callAvailabilitySchedule,
    originalSettings,
  ])

  const fetchSettings = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/creator/feature-settings")

      if (!response.ok) {
        throw new Error("Failed to fetch feature settings")
      }

      const data = await response.json()
      setChatEnabled(data.chatEnabled ?? true)
      setCallEnabled(data.callEnabled ?? true)
      setChatAvailabilitySchedule(data.chatAvailabilitySchedule ?? null)
      setCallAvailabilitySchedule(data.callAvailabilitySchedule ?? null)
      setOriginalSettings({
        chatEnabled: data.chatEnabled ?? true,
        callEnabled: data.callEnabled ?? true,
        chatAvailabilitySchedule: data.chatAvailabilitySchedule ?? null,
        callAvailabilitySchedule: data.callAvailabilitySchedule ?? null,
      })
    } catch (error) {
      console.error("Error fetching feature settings:", error)
      toast.error("Failed to load feature settings")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch("/api/creator/feature-settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chatEnabled,
          callEnabled,
          chatAvailabilitySchedule,
          callAvailabilitySchedule,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update feature settings")
      }

      const data = await response.json()
      setOriginalSettings({
        chatEnabled: data.chatEnabled,
        callEnabled: data.callEnabled,
        chatAvailabilitySchedule: data.chatAvailabilitySchedule ?? null,
        callAvailabilitySchedule: data.callAvailabilitySchedule ?? null,
      })
      setHasChanges(false)
      toast.success("Feature settings updated successfully")
    } catch (error) {
      console.error("Error updating feature settings:", error)
      toast.error(
        error instanceof Error ? error.message : "Failed to update feature settings"
      )
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold text-primary">Feature Settings</h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold text-primary">Feature Settings</h2>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {/* Chat Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="chat-enabled" className="text-base font-medium">
                Chat
              </Label>
              <p className="text-sm text-muted-foreground">
                Allow fans to send you messages
              </p>
            </div>
            <Switch
              id="chat-enabled"
              checked={chatEnabled}
              onCheckedChange={setChatEnabled}
              disabled={isSaving}
            />
          </div>

          {/* Call Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="call-enabled" className="text-base font-medium">
                Calls
              </Label>
              <p className="text-sm text-muted-foreground">
                Allow fans to initiate audio and video calls
              </p>
            </div>
            <Switch
              id="call-enabled"
              checked={callEnabled}
              onCheckedChange={setCallEnabled}
              disabled={isSaving}
            />
          </div>
        </div>

        <Separator />

        {/* Chat Availability Schedule */}
        <div className="space-y-4">
          <div>
            <Label className="text-base font-medium">Chat Availability</Label>
            <p className="text-sm text-muted-foreground">
              Set when fans can send you messages
            </p>
          </div>
          <AvailabilityScheduleEditor
            schedule={chatAvailabilitySchedule}
            onChange={setChatAvailabilitySchedule}
            disabled={isSaving || !chatEnabled}
          />
        </div>

        <Separator />

        {/* Call Availability Schedule */}
        <div className="space-y-4">
          <div>
            <Label className="text-base font-medium">Call Availability</Label>
            <p className="text-sm text-muted-foreground">
              Set when fans can initiate calls
            </p>
          </div>
          <AvailabilityScheduleEditor
            schedule={callAvailabilitySchedule}
            onChange={setCallAvailabilitySchedule}
            disabled={isSaving || !callEnabled}
          />
        </div>

        {/* Save Button */}
        {hasChanges && (
          <div className="pt-4 border-t flex justify-end">
            <Button
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
