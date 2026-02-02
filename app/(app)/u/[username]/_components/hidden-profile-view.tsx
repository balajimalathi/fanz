"use client"

import { useState } from "react"
import { Lock, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LoginModal } from "@/components/creator/login-modal"

type Variant = "login" | "hidden"

interface HiddenProfileViewProps {
  variant: Variant
}

export function HiddenProfileView({ variant }: HiddenProfileViewProps) {
  const [loginOpen, setLoginOpen] = useState(false)

  if (variant === "login") {
    return (
      <>
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Lock className="h-10 w-10 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-semibold mb-2">This profile is private</h1>
          <p className="text-muted-foreground mb-6 max-w-sm">
            Log in to view this profile. If you follow this creator, you will be able to see their content.
          </p>
          <Button onClick={() => setLoginOpen(true)} size="lg">
            Log in to view
          </Button>
        </div>
        <LoginModal open={loginOpen} onOpenChange={setLoginOpen} />
      </>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <EyeOff className="h-10 w-10 text-muted-foreground" />
      </div>
      <h1 className="text-xl font-semibold mb-2">This profile is hidden</h1>
      <p className="text-muted-foreground max-w-sm">
        This creator has chosen to hide their profile. Only their followers can view their content.
      </p>
    </div>
  )
}
