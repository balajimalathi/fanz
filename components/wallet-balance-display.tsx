"use client"

import { useState, useEffect } from "react"
import { Coins, AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useSession } from "@/lib/auth/auth-client"

export function WalletBalanceDisplay() {
  const { data: session } = useSession()
  const [balance, setBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session?.user) {
      setLoading(false)
      return
    }

    const fetchBalance = async () => {
      try {
        const response = await fetch("/api/wallet/balance")
        if (response.ok) {
          const data = await response.json()
          setBalance(data.balance)
        }
      } catch (error) {
        console.error("Error fetching balance:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchBalance()
    // Refresh every 30 seconds
    const interval = setInterval(fetchBalance, 30000)
    return () => clearInterval(interval)
  }, [session?.user])

  if (!session?.user || loading) {
    return null
  }

  const isLowBalance = balance !== null && balance < 50

  return (
    <Badge
      variant={isLowBalance ? "destructive" : "secondary"}
      className="flex items-center gap-1.5 px-2 py-1"
    >
      {isLowBalance ? (
        <AlertTriangle className="h-3 w-3" />
      ) : (
        <Coins className="h-3 w-3" />
      )}
      <span className="text-xs font-medium">
        {balance !== null ? `${balance} coins` : "Loading..."}
      </span>
    </Badge>
  )
}
