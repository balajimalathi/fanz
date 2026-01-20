"use client"

import { useState, useEffect } from "react"
import { Save, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import toast from "react-hot-toast"

export function SocialMediaCard() {
  const [socialMediaLinks, setSocialMediaLinks] = useState<{
    instagram?: string;
    twitter?: string;
    facebook?: string;
    telegram?: string;
    tiktok?: string;
    snapchat?: string;
    youtube?: string;
    linkedin?: string;
  }>({})
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Fetch social media links on mount
  useEffect(() => {
    fetchSocialMediaLinks()
  }, [])

  const fetchSocialMediaLinks = async () => {
    try {
      const response = await fetch("/api/creator/profile")

      if (!response.ok) {
        throw new Error("Failed to fetch social media links")
      }

      const data = await response.json()
      setSocialMediaLinks(data.socialMediaLinks || {})
    } catch (error) {
      console.error("Error fetching social media links:", error)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setMessage(null)

    try {
      const response = await fetch("/api/creator/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          socialMediaLinks: socialMediaLinks,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update social media links")
      }

      const data = await response.json()
      setSocialMediaLinks(data.socialMediaLinks || {})
      setMessage({ type: "success", text: "Social media links updated successfully" })
      toast.success("Social media links updated successfully")
      setTimeout(() => setMessage(null), 5000)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update social media links"
      setMessage({ type: "error", text: errorMessage })
      toast.error(errorMessage)
      setTimeout(() => setMessage(null), 5000)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-primary">Social Media Handles</h2>
        </div>
        <Button onClick={handleSave} disabled={isSaving} size="sm">
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save
            </>
          )}
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

        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Enter your handles with or without @ symbol (e.g., @username or username)
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="instagram" className="text-sm">Instagram</Label>
              <Input
                id="instagram"
                type="text"
                value={socialMediaLinks.instagram || ""}
                onChange={(e) => setSocialMediaLinks({ ...socialMediaLinks, instagram: e.target.value })}
                placeholder="@username or username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="twitter" className="text-sm">Twitter</Label>
              <Input
                id="twitter"
                type="text"
                value={socialMediaLinks.twitter || ""}
                onChange={(e) => setSocialMediaLinks({ ...socialMediaLinks, twitter: e.target.value })}
                placeholder="@username or username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="facebook" className="text-sm">Facebook</Label>
              <Input
                id="facebook"
                type="text"
                value={socialMediaLinks.facebook || ""}
                onChange={(e) => setSocialMediaLinks({ ...socialMediaLinks, facebook: e.target.value })}
                placeholder="@username or username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telegram" className="text-sm">Telegram</Label>
              <Input
                id="telegram"
                type="text"
                value={socialMediaLinks.telegram || ""}
                onChange={(e) => setSocialMediaLinks({ ...socialMediaLinks, telegram: e.target.value })}
                placeholder="@username or username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tiktok" className="text-sm">TikTok</Label>
              <Input
                id="tiktok"
                type="text"
                value={socialMediaLinks.tiktok || ""}
                onChange={(e) => setSocialMediaLinks({ ...socialMediaLinks, tiktok: e.target.value })}
                placeholder="@username or username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="snapchat" className="text-sm">Snapchat</Label>
              <Input
                id="snapchat"
                type="text"
                value={socialMediaLinks.snapchat || ""}
                onChange={(e) => setSocialMediaLinks({ ...socialMediaLinks, snapchat: e.target.value })}
                placeholder="@username or username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="youtube" className="text-sm">YouTube</Label>
              <Input
                id="youtube"
                type="text"
                value={socialMediaLinks.youtube || ""}
                onChange={(e) => setSocialMediaLinks({ ...socialMediaLinks, youtube: e.target.value })}
                placeholder="@username or username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkedin" className="text-sm">LinkedIn</Label>
              <Input
                id="linkedin"
                type="text"
                value={socialMediaLinks.linkedin || ""}
                onChange={(e) => setSocialMediaLinks({ ...socialMediaLinks, linkedin: e.target.value })}
                placeholder="@username or username"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
