import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth/auth-client"

async function VerifyEmailContent() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect("/login")
  }

  // If already verified, redirect to dashboard
  if (session.user.emailVerified) {
    redirect("/creator/dashboard")
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Verify Your Email</CardTitle>
        <CardDescription>
          We've sent a verification email to {session.user.email}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Please check your inbox and click the verification link to complete your account setup.
        </p>
        <form action={async () => {
          "use server"
          // Resend verification email
          // Better-auth handles this through its API
        }}>
          <Button type="submit" variant="outline" className="w-full">
            Resend Verification Email
          </Button>
        </form>
        <p className="text-xs text-muted-foreground text-center">
          Already verified?{" "}
          <a href="/creator/dashboard" className="text-primary hover:underline">
            Go to dashboard
          </a>
        </p>
      </CardContent>
    </Card>
  )
}

export default async function VerifyEmailPage() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <VerifyEmailContent />
    </div>
  )
}

