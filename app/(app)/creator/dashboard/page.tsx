import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/client"
import { creator } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default async function CreatorDashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect("/login")
  }

  // Check if user has creator role
  if (session.user.role !== "creator") {
    redirect("/login")
  }

  // Get creator record
  const creatorRecord = await db.query.creator.findFirst({
    where: (c, { eq: eqOp }) => eqOp(c.id, session.user.id),
  })

  // If not onboarded, redirect to onboarding
  if (!creatorRecord || !creatorRecord.onboarded) {
    redirect("/onboarding")
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Creator Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome back, {creatorRecord.displayName}!
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Your creator profile details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {creatorRecord.username && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Username</p>
                  <p className="text-lg font-semibold">{creatorRecord.username}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-muted-foreground">Display Name</p>
                <p className="text-lg">{creatorRecord.displayName}</p>
              </div>
              {creatorRecord.subdomain && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Subdomain</p>
                  <p className="text-lg">
                    <a
                      href={`https://${creatorRecord.subdomain}.${process.env.NEXT_PUBLIC_DOMAIN || "localhost:3000"}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {creatorRecord.subdomain}
                    </a>
                  </p>
                </div>
              )}
              {creatorRecord.country && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Country</p>
                  <p className="text-lg">{creatorRecord.country}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Creator Details</CardTitle>
              <CardDescription>Your creator type and content settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Creator Type</p>
                <Badge variant="secondary" className="mt-1">
                  {creatorRecord.creatorType === "ai" ? "AI Creator" : "Human Creator"}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Content Type</p>
                <Badge variant="secondary" className="mt-1">
                  {creatorRecord.contentType === "18+" ? "18+ Content" : "General Content"}
                </Badge>
              </div>
              {creatorRecord.gender && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Gender</p>
                  <p className="text-lg capitalize">{creatorRecord.gender.replace("-", " ")}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {creatorRecord.categories && creatorRecord.categories.length > 0 && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Categories</CardTitle>
                <CardDescription>What defines you best</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {(creatorRecord.categories as string[]).map((category) => (
                    <Badge key={category} variant="outline">
                      {category}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
            <CardDescription>Get started with your creator journey</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="text-muted-foreground">✓</span>
                <span>Profile setup complete</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-muted-foreground">→</span>
                <span>Start creating content</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-muted-foreground">→</span>
                <span>Customize your creator page</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

