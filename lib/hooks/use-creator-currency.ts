"use client"

import { useState, useEffect } from "react"

interface CreatorCurrency {
  currency: string | null
  loading: boolean
}

/**
 * Hook to fetch and manage creator currency
 * Returns null for currency while loading - components must show shimmer, not default symbol
 */
export function useCreatorCurrency() {
  const [currencyData, setCurrencyData] = useState<CreatorCurrency>({
    currency: null,
    loading: true,
  })

  useEffect(() => {
    const fetchCurrency = async () => {
      try {
        const response = await fetch("/api/creator/currency")
        if (response.ok) {
          const data = await response.json()
          setCurrencyData({
            currency: data.currency ?? null,
            loading: false,
          })
        } else {
          setCurrencyData({
            currency: null,
            loading: false,
          })
        }
      } catch (error) {
        console.error("Error fetching creator currency:", error)
        setCurrencyData({
          currency: null,
          loading: false,
        })
      }
    }

    fetchCurrency()
  }, [])

  return currencyData
}
