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
import { ProfileCard } from "./profile-card"
import { ServiceCard } from "./service-card"
import { MembershipCard } from "./membership-card"




interface CreatorManagementPageProps {
  creatorId: string
  displayName: string
  bio?: string
}

export function CreatorManagementPage({
  creatorId,
  displayName: initialDisplayName,
  bio: initialBio,
}: CreatorManagementPageProps) { 


  return (
    <div className="space-y-6">
     {/* Profile Section */}
     <ProfileCard initialDisplayName={initialDisplayName} initialBio={initialBio} />

      {/* Services Section */}
      <ServiceCard initialDisplayName={initialDisplayName} initialBio={initialBio} />

      {/* Memberships Section */}
      <MembershipCard initialDisplayName={initialDisplayName} initialBio={initialBio} />
    </div>
  )
}

