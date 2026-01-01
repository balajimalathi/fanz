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
import { Separator } from "@/components/ui/separator"
import { SubHeading } from "@/components/ui/sub-heading"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Loader2, Save, Bell, BellOff, DollarSign, UserPlus, MessageSquare, Mail, Shield, Megaphone } from "lucide-react"
import toast from "react-hot-toast"

type NotificationChannel = 'payout' | 'follow' | 'comment' | 'message' | 'security' | 'platform'

interface ChannelConfig {
  key: NotificationChannel
  label: string
  description: string
  icon: React.ReactNode
}

const CHANNELS: ChannelConfig[] = [
  {
    key: 'payout',
    label: 'Payout Notifications',
    description: 'Status updates, processed payouts, failed transactions',
    icon: <DollarSign className="h-4 w-4" />,
  },
  {
    key: 'follow',
    label: 'Follow Notifications',
    description: 'New followers, unfollows, and follower activity',
    icon: <UserPlus className="h-4 w-4" />,
  },
  {
    key: 'comment',
    label: 'Comment Notifications',
    description: 'Comments on your posts, replies, and interactions',
    icon: <MessageSquare className="h-4 w-4" />,
  },
  {
    key: 'message',
    label: 'Message Notifications',
    description: 'Direct messages, conversations, and chat updates',
    icon: <Mail className="h-4 w-4" />,
  },
  {
    key: 'security',
    label: 'Security Alerts',
    description: 'Login attempts, password changes, account security',
    icon: <Shield className="h-4 w-4" />,
  },
  {
    key: 'platform',
    label: 'Platform Announcements',
    description: 'System updates, feature announcements, important news',
    icon: <Megaphone className="h-4 w-4" />,
  },
]

export default function NotificationSettingsPage() {
  const [enabled, setEnabled] = useState(true)
  const [channels, setChannels] = useState<Record<NotificationChannel, boolean>>({
    payout: true,
    follow: true,
    comment: true,
    message: true,
    security: true,
    platform: true,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchPreferences()
  }, [])

  const fetchPreferences = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/push/preferences")
      if (!response.ok) {
        throw new Error("Failed to fetch notification preferences")
      }
      const data = await response.json()
      setEnabled(data.enabled ?? true)
      if (data.channels) {
        setChannels({
          payout: data.channels.payout ?? true,
          follow: data.channels.follow ?? true,
          comment: data.channels.comment ?? true,
          message: data.channels.message ?? true,
          security: data.channels.security ?? true,
          platform: data.channels.platform ?? true,
        })
      }
    } catch (error) {
      console.error("Error fetching notification preferences:", error)
      toast.error("Failed to load notification preferences")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const response = await fetch("/api/push/preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          enabled,
          channels,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to save preferences")
      }

      toast.success("Notification preferences saved successfully")
    } catch (error) {
      console.error("Error saving notification preferences:", error)
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to save notification preferences"
      )
    } finally {
      setSaving(false)
    }
  }

  const handleChannelToggle = (channel: NotificationChannel, value: boolean) => {
    setChannels((prev) => ({
      ...prev,
      [channel]: value,
    }))
  }

  const handleEnableAll = () => {
    setChannels({
      payout: true,
      follow: true,
      comment: true,
      message: true,
      security: true,
      platform: true,
    })
  }

  const handleDisableAll = () => {
    setChannels({
      payout: false,
      follow: false,
      comment: false,
      message: false,
      security: false,
      platform: false,
    })
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
        title="Notification Settings"
        description="Manage your notification preferences and alerts"
      />
      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>
            Control how and when you receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Global Enable/Disable */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notifications-enabled" className="text-base">
                  Enable Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  {enabled
                    ? "Notifications are enabled. Configure individual channels below."
                    : "Notifications are disabled. You won't receive any alerts"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="notifications-enabled"
                checked={enabled}
                onCheckedChange={setEnabled}
              />
              <div className="flex items-center gap-2">
                {enabled ? (
                  <>
                    <Bell className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Enabled</span>
                  </>
                ) : (
                  <>
                    <BellOff className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">
                      Disabled
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Channel Preferences */}
          {enabled && (
            <>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">Notification Channels</h3>
                    <p className="text-xs text-muted-foreground">
                      Customize which types of notifications you want to receive
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleEnableAll}
                    >
                      Enable All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDisableAll}
                    >
                      Disable All
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  {CHANNELS.map((channel) => (
                    <div
                      key={channel.key}
                      className="flex items-start justify-between p-4 rounded-lg border bg-muted/30"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="text-muted-foreground">
                            {channel.icon}
                          </div>
                          <Label
                            htmlFor={`channel-${channel.key}`}
                            className="text-sm font-semibold cursor-pointer"
                          >
                            {channel.label}
                          </Label>
                        </div>
                        <p className="text-xs text-muted-foreground ml-6">
                          {channel.description}
                        </p>
                      </div>
                      <div className="ml-4">
                        <Switch
                          id={`channel-${channel.key}`}
                          checked={channels[channel.key]}
                          onCheckedChange={(checked) =>
                            handleChannelToggle(channel.key, checked)
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />
            </>
          )}

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
                  Save Preferences
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
