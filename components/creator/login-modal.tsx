"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Icons } from "@/components/ui/icons"
import { googleSignin } from "@/lib/auth/social"

interface LoginModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LoginModal({ open, onOpenChange }: LoginModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Use current pathname as callback URL to return to creator page after login
      const callbackURL = pathname || "/"
      await googleSignin(callbackURL)
      // Redirect will happen after OAuth callback
      onOpenChange(false)
    } catch (err) {
      setError("Failed to login with Google")
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Login Required</DialogTitle>
          <DialogDescription>
            Please login to follow creators and receive notifications
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          {error && (
            <div className="text-sm text-destructive">{error}</div>
          )}
          <Button
            variant="outline"
            type="button"
            className="w-full gap-2"
            onClick={handleGoogleLogin}
            disabled={isLoading}
          >
            <Icons.google size={8} />
            {isLoading ? "Logging in..." : "Login with Google"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

