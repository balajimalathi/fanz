"use client"

import { useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { toast } from "react-hot-toast"
import { CheckCircle2, XCircle } from "lucide-react"

export function PaymentStatusHandler() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const status = searchParams.get("status")
    const membershipId = searchParams.get("membershipId")
    const duration = searchParams.get("duration")

    if (status === "success") {
      const durationText = duration
        ? `${duration} ${parseInt(duration) === 1 ? "month" : "months"}`
        : "membership"
      
      toast.success(
        (t) => (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <div>
              <p className="font-semibold">Subscription Successful!</p>
              <p className="text-sm text-muted-foreground">
                You now have access to exclusive content for {durationText}
              </p>
            </div>
          </div>
        ),
        {
          duration: 5000,
          icon: null,
        }
      )

      // Remove query params after showing toast
      const url = new URL(window.location.href)
      url.searchParams.delete("status")
      url.searchParams.delete("membershipId")
      url.searchParams.delete("duration")
      router.replace(url.pathname + url.search, { scroll: false })
    } else if (status === "failed") {
      toast.error(
        (t) => (
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            <div>
              <p className="font-semibold">Payment Failed</p>
              <p className="text-sm text-muted-foreground">
                Please try again or contact support if the issue persists
              </p>
            </div>
          </div>
        ),
        {
          duration: 5000,
          icon: null,
        }
      )

      // Remove query params after showing toast
      const url = new URL(window.location.href)
      url.searchParams.delete("status")
      router.replace(url.pathname + url.search, { scroll: false })
    }
  }, [searchParams, router])

  return null
}

