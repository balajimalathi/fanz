"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Download, Check } from "lucide-react"
import { toast } from "sonner"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

interface PWAInstallButtonProps {
  className?: string
}

export function PWAInstallButton({ className }: PWAInstallButtonProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return

    // Check if PWA is already installed
    const checkIfInstalled = () => {
      // Check if running in standalone mode (installed PWA)
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches
      // Check if navigator.standalone is true (iOS)
      const isIOSStandalone = (window.navigator as any).standalone === true
      
      return isStandalone || isIOSStandalone
    }

    setIsInstalled(checkIfInstalled())
    setIsSupported("serviceWorker" in navigator)

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the default browser install prompt
      e.preventDefault()
      // Store the event for later use
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    // Listen for the appinstalled event
    const handleAppInstalled = () => {
      console.log("PWA installed successfully")
      setIsInstalled(true)
      setDeferredPrompt(null)
      toast.success("App installed successfully!")
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)

    // Check if already installed on mount
    if (checkIfInstalled()) {
      setIsInstalled(true)
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      toast.error("Install prompt not available. The app may already be installed.")
      return
    }

    setIsLoading(true)
    try {
      // Show the install prompt
      await deferredPrompt.prompt()

      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === "accepted") {
        console.log("User accepted the install prompt")
        toast.success("Installing app...")
        // The appinstalled event will handle the rest
      } else {
        console.log("User dismissed the install prompt")
        toast.info("Installation cancelled")
      }

      // Clear the deferred prompt
      setDeferredPrompt(null)
    } catch (error) {
      console.error("Error showing install prompt:", error)
      toast.error("Failed to show install prompt. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Don't show button if not supported, already installed, or no prompt available
  if (!isSupported || isInstalled || !deferredPrompt) {
    return null
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleInstallClick}
      disabled={isLoading}
      className={className}
    >
      <Download className="mr-2 h-4 w-4" />
      {isLoading ? "Installing..." : "Install App"}
    </Button>
  )
}

