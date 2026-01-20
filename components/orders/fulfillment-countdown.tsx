"use client"

import { useState, useEffect } from "react"
import { Clock, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface FulfillmentCountdownProps {
  deadlineDate: string | null
  isDeadlinePassed: boolean
}

export function FulfillmentCountdown({
  deadlineDate,
  isDeadlinePassed,
}: FulfillmentCountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>("")

  useEffect(() => {
    if (!deadlineDate || isDeadlinePassed) {
      setTimeRemaining("Deadline passed")
      return
    }

    const updateCountdown = () => {
      const now = new Date()
      const deadline = new Date(deadlineDate)
      const diff = deadline.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeRemaining("Deadline passed")
        return
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m`)
      } else if (minutes > 0) {
        setTimeRemaining(`${minutes}m ${seconds}s`)
      } else {
        setTimeRemaining(`${seconds}s`)
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [deadlineDate, isDeadlinePassed])

  if (isDeadlinePassed) {
    return (
      <Badge variant="destructive" className="flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />
        Deadline Passed
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="flex items-center gap-1">
      <Clock className="h-3 w-3" />
      {timeRemaining}
    </Badge>
  )
}
