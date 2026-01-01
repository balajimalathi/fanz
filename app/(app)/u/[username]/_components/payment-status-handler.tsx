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
    const serviceId = searchParams.get("serviceId")
    const postId = searchParams.get("postId")
    const duration = searchParams.get("duration")

    if (status === "success") {
      // Determine payment type and show appropriate message
      if (membershipId) {
        // Membership payment success
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
      } else if (serviceId) {
        // Service payment success
        toast.success(
          (t) => (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-semibold">Payment Successful!</p>
                <p className="text-sm text-muted-foreground">
                  Your service order has been confirmed
                </p>
              </div>
            </div>
          ),
          {
            duration: 5000,
            icon: null,
          }
        )
      } else if (postId) {
        // Exclusive post payment success
        toast.success(
          (t) => (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-semibold">Payment Successful!</p>
                <p className="text-sm text-muted-foreground">
                  You now have access to this exclusive post
                </p>
              </div>
            </div>
          ),
          {
            duration: 5000,
            icon: null,
          }
        )
      } else {
        // Generic success (fallback)
        toast.success(
          (t) => (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-semibold">Payment Successful!</p>
              </div>
            </div>
          ),
          {
            duration: 5000,
            icon: null,
          }
        )
      }

      // Remove all query params after showing toast
      const url = new URL(window.location.href)
      url.searchParams.delete("status")
      url.searchParams.delete("membershipId")
      url.searchParams.delete("serviceId")
      url.searchParams.delete("postId")
      url.searchParams.delete("duration")
      url.searchParams.delete("transactionId")
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

      // Remove all query params after showing toast
      const url = new URL(window.location.href)
      url.searchParams.delete("status")
      url.searchParams.delete("membershipId")
      url.searchParams.delete("serviceId")
      url.searchParams.delete("postId")
      url.searchParams.delete("duration")
      url.searchParams.delete("transactionId")
      router.replace(url.pathname + url.search, { scroll: false })
    }
  }, [searchParams, router])

  return null
}

