import { notFound } from "next/navigation"
import { Suspense } from "react"
import { db } from "@/lib/db/client"
import { ProfileHeader } from "@/components/creator/profile-header"
import { ServiceDisplayCard } from "@/components/creator/service-display-card"
import { MembershipDisplayCard } from "@/components/creator/membership-display-card"
import { Separator } from "@/components/ui/separator"
import { FeedSection } from "./_components/feed-section"
import { ChatOverlay } from "@/components/chat/chat-overlay"
import { ChatPageWrapper } from "./_components/chat-wrapper"
import { PaymentStatusHandler } from "./_components/payment-status-handler"

async function getCreatorProfile(username: string) {
  try {
    // Fetch creator by username (case-insensitive - usernames are stored in lowercase)
    const creatorRecord = await db.query.creator.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.username, username.toLowerCase()),
    })

    if (!creatorRecord || !creatorRecord.onboarded) {
      return null
    }

    // Fetch visible services for this creator
    const services = await db.query.service.findMany({
      where: (s, { eq: eqOp, and: andOp }) =>
        andOp(eqOp(s.creatorId, creatorRecord.id), eqOp(s.visible, true)),
      orderBy: (s, { desc }) => [desc(s.createdAt)],
    })

    // Fetch visible memberships for this creator
    const memberships = await db.query.membership.findMany({
      where: (m, { eq: eqOp, and: andOp }) =>
        andOp(eqOp(m.creatorId, creatorRecord.id), eqOp(m.visible, true)),
      orderBy: (m, { desc }) => [desc(m.createdAt)],
    })

    // Convert prices from paise to rupees for display
    const servicesWithRupees = services.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      price: s.price / 100, // Convert paise to rupees
      serviceType: s.serviceType,
    }))

    const membershipsWithRupees = memberships.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      monthlyRecurringFee: m.monthlyRecurringFee / 100, // Convert paise to rupees
      coverImageUrl: m.coverImageUrl,
    }))

    return {
      creator: {
        id: creatorRecord.id,
        username: creatorRecord.username,
        displayName: creatorRecord.displayName,
        bio: creatorRecord.bio,
        profileImageUrl: creatorRecord.profileImageUrl,
        profileCoverUrl: creatorRecord.profileCoverUrl,
        country: creatorRecord.country,
        creatorType: creatorRecord.creatorType,
        contentType: creatorRecord.contentType,
        categories: creatorRecord.categories,
      },
      services: servicesWithRupees,
      memberships: membershipsWithRupees,
    }
  } catch (error) {
    console.error("Error fetching creator profile:", error)
    return null
  }
}

export default async function Page({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const data = await getCreatorProfile(username)

  if (!data || !data.creator) {
    notFound()
  }

  const { creator, services, memberships } = data

  return (
    <ChatPageWrapper creatorId={creator.id} creatorName={creator.displayName} creatorImage={creator.profileImageUrl}>
      <Suspense fallback={null}>
        <PaymentStatusHandler />
      </Suspense>
      <div className="min-h-screen bg-background">
        {/* Profile Header */}
        <ProfileHeader
          displayName={creator.displayName}
          username={creator.username ?? "--"}
          bio={creator.bio}
          profileImageUrl={creator.profileImageUrl}
          profileCoverUrl={creator.profileCoverUrl}
          creatorId={creator.id}
        />

        {/* Content Sections */}
        <div className="px-4 sm:px-6 lg:px-8 pb-8 sm:pb-12 max-w-7xl mx-auto">
          {/* Feed Section */}
          <section className="mb-12 sm:mb-16">
            <FeedSection
              username={creator.username ?? ""}
              creatorId={creator.id}
              memberships={memberships}
            />
          </section>

          {/* Separator between feed and other sections */}
          {(services.length > 0 || memberships.length > 0) && (
            <Separator className="my-8 sm:my-12" />
          )}

          {/* Services Section */}
          {services.length > 0 && (
            <section className="mb-12 sm:mb-16">
              <div className="mb-6 sm:mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
                  Services
                </h2>
                <p className="text-muted-foreground text-sm sm:text-base">
                  Available services from this creator
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {services.map((service: any) => (
                  <ServiceDisplayCard
                    key={service.id}
                    id={service.id}
                    name={service.name}
                    description={service.description}
                    price={service.price}
                    creatorId={creator.id}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Separator between sections if both exist */}
          {services.length > 0 && memberships.length > 0 && (
            <Separator className="my-8 sm:my-12" />
          )}

          {/* Memberships Section */}
          {memberships.length > 0 && (
            <section>
              <div className="mb-6 sm:mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
                  Memberships
                </h2>
                <p className="text-muted-foreground text-sm sm:text-base">
                  Join exclusive memberships to support this creator
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {memberships.map((membership: any) => (
                  <MembershipDisplayCard
                    key={membership.id}
                    id={membership.id}
                    title={membership.title}
                    description={membership.description}
                    monthlyRecurringFee={membership.monthlyRecurringFee}
                    coverImageUrl={membership.coverImageUrl}
                    creatorId={creator.id}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Empty State */}
          {services.length === 0 && memberships.length === 0 && (
            <div className="text-center py-12 sm:py-16">
              <p className="text-muted-foreground text-sm sm:text-base">
                No services or memberships available yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </ChatPageWrapper>
  )
}
