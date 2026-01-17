import { notFound } from "next/navigation"
import { Suspense } from "react"
import { db } from "@/lib/db/client"
import { ProfileHeader } from "@/components/creator/profile-header"
import { PaymentStatusHandler } from "./_components/payment-status-handler"
import { CreatorPageClient } from "./_components/creator-page-client"
import { CreatorProfileTabs } from "./_components/creator-profile-tabs"

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

    // Get creator's preferred currency
    const creatorCurrency = creatorRecord.currency || "USD"
    const { getCurrencyDecimals } = await import("@/lib/currency/currency-utils")
    const currencyDecimals = getCurrencyDecimals(creatorCurrency)
    const currencyDivisor = Math.pow(10, currencyDecimals)

    // Convert prices from subunits to display format
    const servicesWithDisplay = services.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      price: s.price / currencyDivisor, // Convert subunits to display format
      currency: creatorCurrency,
      serviceType: s.serviceType,
    }))

    const membershipsWithDisplay = memberships.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      monthlyRecurringFee: m.monthlyRecurringFee / currencyDivisor, // Convert subunits to display format
      currency: creatorCurrency,
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
        chatEnabled: creatorRecord.chatEnabled ?? true,
        callEnabled: creatorRecord.callEnabled ?? true,
      },
      services: servicesWithDisplay,
      memberships: membershipsWithDisplay,
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

  // Get creator user details for chat window
  const creatorUser = await db.query.user.findFirst({
    where: (u, { eq: eqOp }) => eqOp(u.id, creator.id),
  })

  // Use currency from services/memberships (already converted) or default
  const currency = services[0]?.currency || memberships[0]?.currency || "USD"

  return (
    <>
      <Suspense fallback={null}>
        <PaymentStatusHandler />
      </Suspense>
      <CreatorPageClient
        creatorId={creator.id}
        creatorName={creator.displayName}
        creatorImage={creatorUser?.image || creator.profileImageUrl}
        username={creator.username ?? ""}
        chatEnabled={creator.chatEnabled}
        callEnabled={creator.callEnabled}
      >
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

          {/* Ko-fi Style Tabbed Content */}
          <CreatorProfileTabs
            creator={{
              id: creator.id,
              username: creator.username,
              displayName: creator.displayName,
              bio: creator.bio,
              profileImageUrl: creator.profileImageUrl,
              country: creator.country,
              creatorType: creator.creatorType,
              contentType: creator.contentType,
              categories: creator.categories,
            }}
            services={services}
            memberships={memberships}
            currency={currency}
          />
        </div>
      </CreatorPageClient>
    </>
  )
}
