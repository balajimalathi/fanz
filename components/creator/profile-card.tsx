"use client"

import { useState, useRef, useEffect } from "react"
import { Edit2, Eye, EyeOff, Save, Upload, X, Loader2, ExternalLink, Link2, Check } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ImageCropper } from "@/components/ui/image-cropper"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { validateImageFile } from "@/lib/utils/image-processing"
import { validateUsernameFormat, isReservedSubdomain } from "@/lib/onboarding/validation-client"
import { cn } from "@/lib/utils"
import Image from "next/image"

export function ProfileCard({ initialDisplayName, initialBio, initialUsername }: { initialDisplayName: string, initialBio?: string, initialUsername?: string }) {

  const [username, setUsername] = useState(initialUsername || "")
  const [displayName, setDisplayName] = useState(initialDisplayName)
  const [bio, setBio] = useState(initialBio || "")
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isProfileVisible, setIsProfileVisible] = useState(true)
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null)
  const [profileCoverUrl, setProfileCoverUrl] = useState<string | null>(null)
  const [isLoadingImages, setIsLoadingImages] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [usernameLocked, setUsernameLocked] = useState(false)
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)

  // Image cropping states
  const [showCropper, setShowCropper] = useState(false)
  const [cropperImage, setCropperImage] = useState<File | null>(null)
  const [cropperType, setCropperType] = useState<"profile" | "cover" | null>(null)

  const profileImageInputRef = useRef<HTMLInputElement>(null)
  const coverImageInputRef = useRef<HTMLInputElement>(null)

  // Fetch creator profile data and images on mount
  useEffect(() => {
    fetchCreatorProfile()
    fetchCreatorImages()
  }, [])

  const fetchCreatorProfile = async () => {
    try {
      const response = await fetch("/api/creator/profile")

      if (!response.ok) {
        throw new Error("Failed to fetch creator profile")
      }

      const data = await response.json()
      setUsername(data.username || "")
      setDisplayName(data.displayName || initialDisplayName)
      setBio(data.bio || "")
      setUsernameLocked(data.usernameLocked || false)
    } catch (error) {
      console.error("Error fetching profile:", error)
      // Use initial values if fetch fails
    }
  }

  const fetchCreatorImages = async () => {
    try {
      setIsLoadingImages(true)
      const response = await fetch("/api/creator/images")

      if (!response.ok) {
        throw new Error("Failed to fetch creator images")
      }

      const data = await response.json()
      setProfileImageUrl(data.profileImageUrl)
      setProfileCoverUrl(data.profileCoverUrl)
    } catch (error) {
      console.error("Error fetching images:", error)
      // Don't show error to user, just leave images as null
    } finally {
      setIsLoadingImages(false)
    }
  }

  const handleUsernameChange = (value: string) => {
    setUsername(value)
    setUsernameError(null)

    // Client-side validation
    if (value) {
      const formatCheck = validateUsernameFormat(value)
      if (!formatCheck.valid) {
        setUsernameError(formatCheck.error || "Invalid username")
        return
      }

      if (isReservedSubdomain(value)) {
        setUsernameError("This username is reserved and cannot be used")
        return
      }
    }
  }

  const handleSaveProfile = async () => {
    // Validate displayName
    if (!displayName || displayName.trim().length === 0) {
      setMessage({ type: "error", text: "Display name is required" })
      setTimeout(() => setMessage(null), 5000)
      return
    }

    // Validate username if provided and not locked
    if (!usernameLocked && username) {
      const formatCheck = validateUsernameFormat(username)
      if (!formatCheck.valid) {
        setUsernameError(formatCheck.error || "Invalid username")
        setMessage({ type: "error", text: formatCheck.error || "Invalid username" })
        setTimeout(() => setMessage(null), 5000)
        return
      }

      if (isReservedSubdomain(username)) {
        setUsernameError("This username is reserved and cannot be used")
        setMessage({ type: "error", text: "This username is reserved and cannot be used" })
        setTimeout(() => setMessage(null), 5000)
        return
      }
    }

    setIsSaving(true)
    setMessage(null)

    try {
      const response = await fetch("/api/creator/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: usernameLocked ? undefined : username,
          displayName: displayName.trim(),
          bio: bio.trim() || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update profile")
      }

      const data = await response.json()

      // Update state with saved values
      setUsername(data.username || "")
      setDisplayName(data.displayName)
      setBio(data.bio || "")
      setUsernameLocked(data.usernameLocked || false)
      setUsernameError(null)

      setIsEditingProfile(false)
      setMessage({ type: "success", text: "Profile updated successfully" })
      setTimeout(() => setMessage(null), 5000)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update profile"
      setMessage({ type: "error", text: errorMessage })
      setTimeout(() => setMessage(null), 5000)
    } finally {
      setIsSaving(false)
    }
  }

  const handleImageSelect = (type: "profile" | "cover") => {
    const input = type === "profile" ? profileImageInputRef.current : coverImageInputRef.current
    input?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: "profile" | "cover") => {
    const file = e.target.files?.[0]
    if (!file) return

    const validationError = validateImageFile(file)
    if (validationError) {
      alert(validationError)
      return
    }

    setCropperImage(file)
    setCropperType(type)
    setShowCropper(true)
  }

  const handleCropComplete = async (blob: Blob) => {
    if (!cropperType) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", blob, `${cropperType}.jpg`)
      formData.append("type", cropperType)

      const response = await fetch("/api/creator/images", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to upload image")
      }

      const data = await response.json()

      if (cropperType === "profile") {
        setProfileImageUrl(data.url)
      } else {
        setProfileCoverUrl(data.url)
      }

      setShowCropper(false)
      setCropperImage(null)
      setCropperType(null)
    } catch (error) {
      console.error("Error uploading image:", error)
      alert(error instanceof Error ? error.message : "Failed to upload image")
    } finally {
      setIsUploading(false)
    }
  }

  return (

    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-primary">Profile</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {isProfileVisible ? "Visible" : "Hidden"}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsProfileVisible(!isProfileVisible)}
          >
            {isProfileVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>
          {!isEditingProfile && (
            <Button
              onClick={() => setIsEditingProfile(true)}
              variant="outline"
              size="sm"
              aria-label="Edit profile"
            >
              <Edit2 className="h-4 w-4" />
              Edit Profile
            </Button>
          )}
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

        {isEditingProfile ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">
                Username {usernameLocked && <span className="text-xs text-muted-foreground">(Locked)</span>}
              </Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                placeholder="Enter your username"
                disabled={usernameLocked}
                className={cn(usernameError && "border-destructive")}
              />
              {usernameError && (
                <p className="text-sm text-destructive">{usernameError}</p>
              )}
              {usernameLocked && (
                <p className="text-xs text-muted-foreground">
                  Your username is locked and cannot be changed
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your display name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell your fans about yourself..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                {bio.length}/500 characters
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditingProfile(false)
                  setUsernameError(null)
                  setMessage(null)
                  // Reset to saved values
                  fetchCreatorProfile()
                }}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveProfile} disabled={isSaving}>
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
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <div>
                <h3 className="font-medium">{displayName}</h3>
              </div>
              {username && (
                <div>
                  <p className="text-sm text-muted-foreground">@{username}</p>
                </div>
              )}
              {bio && (
                <p className="text-sm text-muted-foreground whitespace-pre-line">{bio}</p>
              )}
            </div>

            {/* Preview and Share Buttons */}
            {username && (
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    window.open(`/u/${username}`, "_blank")
                  }}
                  className="flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  Preview
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={async () => {
                    try {
                      // Get domain from NEXT_PUBLIC_APP_URL or use current hostname
                      let domain: string
                      if (typeof window !== "undefined") {
                        const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
                        try {
                          domain = new URL(appUrl).hostname
                        } catch {
                          // If URL parsing fails, extract domain from origin
                          domain = window.location.hostname
                        }
                      } else {
                        domain = "localhost:3000" // Fallback for SSR
                      }
                      const shareLink = `${username}.${domain}`
                      
                      await navigator.clipboard.writeText(shareLink)
                      setLinkCopied(true)
                      setTimeout(() => setLinkCopied(false), 2000)
                    } catch (error) {
                      console.error("Failed to copy link:", error)
                      setMessage({ type: "error", text: "Failed to copy link" })
                      setTimeout(() => setMessage(null), 5000)
                    }
                  }}
                  className="flex items-center gap-2"
                >
                  {linkCopied ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Link2 className="h-4 w-4" />
                      Share Link
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Profile Images Section */}
        <div className="pt-4 border-t space-y-4">
          <div className="space-y-2">
            <Label>Profile Image (400×400px)</Label>
            <div className="flex items-center gap-4">
              {profileImageUrl ? (
                <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-border">
                  <Image
                    src={profileImageUrl}
                    alt="Profile"
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full bg-muted border-2 border-dashed border-border flex items-center justify-center">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleImageSelect("profile")}
                  disabled={isUploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {profileImageUrl ? "Change" : "Upload"}
                </Button>
                {profileImageUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setProfileImageUrl(null)}
                    disabled={isUploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <input
                ref={profileImageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileChange(e, "profile")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Profile Cover (1200×400px)</Label>
            <div className="flex items-center gap-4">
              {profileCoverUrl ? (
                <div className="relative w-full h-32 rounded-lg overflow-hidden border-2 border-border">
                  <Image
                    src={profileCoverUrl}
                    alt="Cover"
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-full h-32 rounded-lg bg-muted border-2 border-dashed border-border flex items-center justify-center">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleImageSelect("cover")}
                  disabled={isUploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {profileCoverUrl ? "Change" : "Upload"}
                </Button>
                {profileCoverUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setProfileCoverUrl(null)}
                    disabled={isUploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <input
                ref={coverImageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileChange(e, "cover")}
              />
            </div>
          </div>
        </div>
      </CardContent>

      {/* Image Cropper Sheet */}
      <Sheet open={showCropper} onOpenChange={setShowCropper}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              Crop {cropperType === "profile" ? "Profile" : "Cover"} Image
            </SheetTitle>
          </SheetHeader>
          {cropperImage && cropperType && (
            <div className="mt-4">
              <ImageCropper
                image={cropperImage}
                aspectRatio={cropperType === "profile" ? 1 : 3}
                targetWidth={cropperType === "profile" ? 400 : 1200}
                targetHeight={cropperType === "profile" ? 400 : 400}
                onCropComplete={handleCropComplete}
                onCancel={() => {
                  setShowCropper(false)
                  setCropperImage(null)
                  setCropperType(null)
                }}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </Card>
  )
}