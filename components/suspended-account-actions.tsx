"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LogOut, Loader2 } from "lucide-react"
import { signOut } from "@/lib/auth/auth-client"

export function SuspendedAccountActions() {
  const router = useRouter()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await signOut()
      // Redirect to login after successful sign out
      router.push("/login")
      // Force redirect as fallback
      setTimeout(() => {
        window.location.href = "/login"
      }, 1000)
    } catch (error) {
      console.error("Error signing out:", error)
      // Force redirect even if sign out fails
      window.location.href = "/login"
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <Button
      onClick={handleSignOut}
      variant="outline"
      className="w-full"
      disabled={isSigningOut}
    >
      {isSigningOut ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Signing Out...
        </>
      ) : (
        <>
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </>
      )}
    </Button>
  )
}
