import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/client"
import { user } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle } from "lucide-react"
import { SuspendedAccountActions } from "@/components/suspended-account-actions"

export default async function SuspendedAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; error_description?: string }>
}) {
  // Try to get the current session to show user-specific info
  let banReason: string | null = null
  let banExpires: Date | null = null
  const params = await searchParams
  const errorDescription = params?.error_description

  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (session?.user?.id) {
      // Try to get user record directly from database
      // This works even if better-auth has invalidated the session
      const userRecord = await db.query.user.findFirst({
        where: (u, { eq: eqOp }) => eqOp(u.id, session.user.id),
      })

      if (userRecord) {
        banReason = userRecord.banReason
        banExpires = userRecord.banExpires
      }
    }
  } catch (error: any) {
    // If session check fails (e.g., user is banned and better-auth rejects the session),
    // try to extract user ID from error or use error description from query params
    if (errorDescription) {
      banReason = errorDescription
    }
    // If we get a banned user error, we know the user is banned
    // but we can't get their details if session is invalid
    // This is fine - we'll show a generic message
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Account Suspended</CardTitle>
          <CardDescription>
            Your account has been temporarily suspended
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {banReason && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-1">Reason:</p>
              <p className="text-sm text-muted-foreground">{banReason}</p>
            </div>
          )}

          {banExpires && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-1">Suspension Expires:</p>
              <p className="text-sm text-muted-foreground">
                {new Date(banExpires).toLocaleString()}
              </p>
            </div>
          )}

          {!banExpires && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                This suspension is temporary. If you believe this is an error, please contact support.
              </p>
            </div>
          )}

          <div className="space-y-2 pt-4">
            <SuspendedAccountActions />
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Need help? Contact our support team for assistance.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
