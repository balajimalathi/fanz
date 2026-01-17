"use client"

import { ProfileCard } from "./profile-card"
import { ServiceCard } from "./service-card"
import { PricingCard } from "./pricing-card"
import { MembershipCard } from "./membership-card"
import { FeatureSettingsCard } from "./feature-settings-card"
 
interface CreatorManagementPageProps {
  creatorId: string
  displayName: string
  username?: string
  bio?: string
}

export function CreatorManagementPage({
  creatorId,
  displayName: initialDisplayName,
  username: initialUsername,
  bio: initialBio,
}: CreatorManagementPageProps) {


  return (
    <div className="space-y-6">
      {/* Profile Section */}
      <ProfileCard 
        initialDisplayName={initialDisplayName} 
        initialBio={initialBio}
        initialUsername={initialUsername}
      />

      {/* Feature Settings Section */}
      <FeatureSettingsCard />

      {/* Services Section */}
      <ServiceCard />

      {/* Pricing Section */}
      <PricingCard />

      {/* Memberships Section */}
      <MembershipCard />
    </div>
  )
}

