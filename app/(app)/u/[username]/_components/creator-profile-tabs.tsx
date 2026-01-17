"use client"

import { useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { FeedSection } from "./feed-section"
import { GallerySection } from "./gallery-section"
import { ServiceDisplayCard } from "@/components/creator/service-display-card"
import { MembershipDisplayCard } from "@/components/creator/membership-display-card"
import { SupportOptionsCard } from "@/components/creator/support-options-card"
import { Share2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

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
  const [copied, setCopied] = useState(false)

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
        setCopied(true)
        toast.success("Link copied to clipboard!")
        setTimeout(() => setCopied(false), 2000)
      } catch (error) {
        console.error("Failed to copy URL:", error)
        toast.error("Failed to copy link")
      }
    }
  }

  return (
    <div className="w-full">
      {/* Single Tabs component wrapping both navigation and content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Navigation Tabs */}
        <div className="sticky top-0 z-10 bg-background border-b border-border">
          <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between py-2">
              <TabsList>
                <TabsTrigger value="posts">Posts</TabsTrigger>
                <TabsTrigger value="gallery">Gallery</TabsTrigger>
                {memberships.length > 0 && (
                  <TabsTrigger value="membership">Membership</TabsTrigger>
                )}
                {services.length > 0 && (
                  <TabsTrigger value="shop">Services</TabsTrigger>
                )}
              </TabsList>

              {/* Share Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                className="hidden sm:flex items-center gap-2 text-muted-foreground hover:text-foreground"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Share2 className="h-4 w-4" />
                )}
                <span className="hidden md:inline">Share</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="px-4 sm:px-6 lg:px-8 pb-8 sm:pb-12 max-w-7xl mx-auto">
          {/* Posts Tab */}
          <TabsContent value="posts" className="mt-6 focus-visible:outline-none">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content - Full width on mobile, 2/3 on desktop */}
              <div className="lg:col-span-2 order-2 lg:order-1">
                <FeedSection
                  username={creator.username ?? ""}
                  creatorId={creator.id}
                  memberships={memberships}
                  hideHeading
                />
              </div>

              {/* Support Card - Shows on desktop sidebar */}
              {/* <div className="lg:col-span-1 order-1 lg:order-2">
                <div className="lg:sticky lg:top-20">
                  <SupportOptionsCard
                    creatorId={creator.id}
                    creatorName={creator.displayName}
                    memberships={memberships}
                    currency={currency}
                  />
                </div>
              </div> */}
            </div>
          </TabsContent>

          {/* Gallery Tab */}
          <TabsContent value="gallery" className="mt-6 focus-visible:outline-none">
            <GallerySection username={creator.username ?? ""} />
          </TabsContent>

          {/* Membership Tab */}
          {memberships.length > 0 && (
            <TabsContent value="membership" className="mt-6 focus-visible:outline-none">
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Memberships</h2>
                  <p className="text-muted-foreground mt-1">
                    Join exclusive memberships to support {creator.displayName}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {memberships.map((membership) => (
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
              </div>
            </TabsContent>
          )}

          {/* Services Tab */}
          {services.length > 0 && (
            <TabsContent value="shop" className="mt-6 focus-visible:outline-none">
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Services</h2>
                  <p className="text-muted-foreground mt-1">
                    Available services from {creator.displayName}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {services.map((service) => (
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
              </div>
            </TabsContent>
          )}
        </div>
      </Tabs>
    </div>
  )
}
