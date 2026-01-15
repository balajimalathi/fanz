"use client"

import { useState, useEffect } from "react"

interface CreatorCurrency {
  currency: string
  loading: boolean
}

/**
 * Hook to fetch and manage creator currency
 * Returns the creator's currency for pricing and payouts
 */
export function useCreatorCurrency() {
  const [currencyData, setCurrencyData] = useState<CreatorCurrency>({
    currency: "USD",
    loading: true,
  })

  useEffect(() => {
    const fetchCurrency = async () => {
      try {
        const response = await fetch("/api/creator/currency")
        if (response.ok) {
          const data = await response.json()
          setCurrencyData({
            currency: data.currency || "USD",
            loading: false,
          })
        } else {
          setCurrencyData({
            currency: "USD",
            loading: false,
          })
        }
      } catch (error) {
        console.error("Error fetching creator currency:", error)
        setCurrencyData({
          currency: "USD",
          loading: false,
        })
      }
    }

    fetchCurrency()
  }, [])

  return currencyData
}

