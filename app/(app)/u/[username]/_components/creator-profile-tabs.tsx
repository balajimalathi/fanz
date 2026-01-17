"use client"

import { useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { FeedSection } from "./feed-section"
import { ServiceDisplayCard } from "@/components/creator/service-display-card"
import { MembershipDisplayCard } from "@/components/creator/membership-display-card"
import { SupportOptionsCard } from "@/components/creator/support-options-card"
import { Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CreatorProfileTabsProps {
  creator: {
    id: string
    username: string | null
    displayName: string
    bio: string | null
    profileImageUrl: string | null
    country: string | null
    creatorType: string | null
    contentType: string | null
    categories: string[] | null
  }
  services: Array<{
    id: string
    name: string
    description: string
    price: number
    currency: string
    serviceType: string
  }>
  memberships: Array<{
    id: string
    title: string
    description: string
    monthlyRecurringFee: number
    currency: string
    coverImageUrl: string | null
  }>
  currency: string
}

export function CreatorProfileTabs({
  creator,
  services,
  memberships,
  currency,
}: CreatorProfileTabsProps) {
  const [activeTab, setActiveTab] = useState("posts")

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${creator.displayName} on DesiFans`,
          text: `Check out ${creator.displayName} on DesiFans`,
          url: url,
        })
      } catch (error) {
        // User cancelled or error occurred
        console.log("Share cancelled or failed:", error)
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(url)
      } catch (error) {
        console.error("Failed to copy URL:", error)
      }
    }
  }

  return (
    <div className="w-full">
      {/* Navigation Tabs - Ko-fi style with underline */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-transparent h-auto p-0 w-full justify-start border-none">
              {/* <TabsTrigger
                value="about"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none px-4 py-3 text-sm font-medium"
              >
                About
              </TabsTrigger> */}
              <TabsTrigger
                value="posts"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none px-4 py-3 text-sm font-medium"
              >
                Posts
              </TabsTrigger>
              {memberships.length > 0 && (
                <TabsTrigger
                  value="membership"
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none px-4 py-3 text-sm font-medium"
                >
                  Membership
                </TabsTrigger>
              )}
              {/* <TabsTrigger
                value="gallery"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none px-4 py-3 text-sm font-medium"
              >
                Gallery
              </TabsTrigger> */}
              {services.length > 0 && (
                <TabsTrigger
                  value="shop"
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none px-4 py-3 text-sm font-medium"
                >
                  Services
                </TabsTrigger>
              )}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-4 sm:px-6 lg:px-8 pb-8 sm:pb-12 max-w-7xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* About Tab */}
          <TabsContent value="about" className="mt-6">
            <div className="max-w-3xl">
              {creator.bio ? (
                <Card className="bg-gray-50 dark:bg-gray-900/50 rounded-lg shadow-sm">
                  <CardContent className="pt-6">
                    <h2 className="text-xl font-semibold mb-4">About</h2>
                    <p className="text-sm sm:text-base text-foreground whitespace-pre-line leading-relaxed">
                      {creator.bio}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-gray-50 dark:bg-gray-900/50 rounded-lg shadow-sm">
                  <CardContent className="pt-6">
                    <p className="text-muted-foreground text-sm sm:text-base">
                      No bio available yet.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Membership Tab */}
          {memberships.length > 0 && (
            <TabsContent value="membership" className="mt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {memberships.map((membership: any) => (
                  <MembershipDisplayCard
                    key={membership.id}
                    id={membership.id}
                    title={membership.title}
                    description={membership.description}
                    monthlyRecurringFee={membership.monthlyRecurringFee}
                    currency={membership.currency}
                    coverImageUrl={membership.coverImageUrl}
                    creatorId={creator.id}
                  />
                ))}
              </div>
            </TabsContent>
          )}

          {/* Gallery Tab */}
          <TabsContent value="gallery" className="mt-6">
            <Card className="bg-gray-50 dark:bg-gray-900/50 rounded-lg shadow-sm">
              <CardContent className="pt-6">
                <p className="text-muted-foreground text-sm sm:text-base text-center py-8">
                  Gallery coming soon
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Posts Tab - Two Column Layout */}
          <TabsContent value="posts" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Main Content (2/3 width) */}
              <div className="lg:col-span-2">
                <FeedSection
                  username={creator.username ?? ""}
                  creatorId={creator.id}
                  memberships={memberships}
                />
              </div>

              {/* Right Column - Support Card (1/3 width) */}
              {/* <div className="lg:col-span-1">
                <SupportOptionsCard
                  creatorId={creator.id}
                  creatorName={creator.displayName}
                  memberships={memberships}
                  currency={currency}
                />
              </div> */}
            </div>
          </TabsContent>

          {/* Shop Tab */}
          {services.length > 0 && (
            <TabsContent value="shop" className="mt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {services.map((service: any) => (
                  <ServiceDisplayCard
                    key={service.id}
                    id={service.id}
                    name={service.name}
                    description={service.description}
                    price={service.price}
                    currency={service.currency}
                    creatorId={creator.id}
                  />
                ))}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  )
}
