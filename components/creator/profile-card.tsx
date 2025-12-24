"use client"

import { useState } from "react"
import { Edit2, Plus, X, Eye, EyeOff, Save, Trash } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

export function ProfileCard({ initialDisplayName, initialBio }: { initialDisplayName: string, initialBio?: string }) {

  const [displayName, setDisplayName] = useState(initialDisplayName)
  const [bio, setBio] = useState(initialBio || "")
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isProfileVisible, setIsProfileVisible] = useState(true)
  
  const handleSaveProfile = () => {
    // TODO: Save to backend
    setIsEditingProfile(false)
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
        {isEditingProfile ? (
          <div className="space-y-4">
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
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditingProfile(false)
                  setDisplayName(initialDisplayName)
                  setBio(initialBio || "")
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveProfile}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div>
              <h3 className="font-medium">{displayName}</h3>
            </div>
            {bio && (
              <p className="text-sm text-muted-foreground">{bio}</p>
            )}
          </div>
        )}

        {/* Profile Image Placeholder - To be implemented */}
        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            Profile & Cover Images (Coming soon)
          </p>
        </div>
      </CardContent>
    </Card >
  )
}