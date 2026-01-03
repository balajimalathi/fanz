"use client";

import { useCurrencyDetection } from "@/lib/currency/client-detection";
import { formatCurrency } from "@/lib/currency/currency-utils";
import { useState, useEffect } from "react";

interface PriceDisplayProps {
  amount: number; // Amount in original currency's smallest unit
  originalCurrency: string; // ISO 4217 currency code
  className?: string;
  showOriginal?: boolean; // Show original currency on hover
  loading?: boolean;
}

/**
 * Price display component
 * Automatically converts and displays prices in user's preferred currency
 */
export function PriceDisplay({
  amount,
  originalCurrency,
  className,
  showOriginal = true,
  loading: externalLoading,
}: PriceDisplayProps) {
  const { currency: userCurrency, loading: currencyLoading } = useCurrencyDetection();
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const convertPrice = async () => {
      if (currencyLoading || externalLoading) {
        return;
      }

      if (originalCurrency.toUpperCase() === userCurrency.toUpperCase()) {
        setConvertedAmount(amount);
        return;
      }

      setIsConverting(true);
      try {
        const response = await fetch("/api/currency/convert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount,
            fromCurrency: originalCurrency,
            toCurrency: userCurrency,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setConvertedAmount(data.convertedAmount);
        } else {
          throw new Error("Failed to convert currency");
        }
      } catch (error) {
        console.error("Error converting price:", error);
        // Fallback to original amount
        setConvertedAmount(amount);
      } finally {
        setIsConverting(false);
      }
    };

    convertPrice();
  }, [amount, originalCurrency, userCurrency, currencyLoading, externalLoading]);

  const isLoading = currencyLoading || externalLoading || isConverting;
  const displayAmount = convertedAmount ?? amount;
  const displayCurrency = convertedAmount !== null ? userCurrency : originalCurrency;
  const isConverted = originalCurrency.toUpperCase() !== userCurrency.toUpperCase();

  if (isLoading && convertedAmount === null) {
    return (
      <span className={className}>
        <span className="animate-pulse">...</span>
      </span>
    );
  }

  const formattedPrice = formatCurrency(displayAmount, displayCurrency);

  return (
    <span
      className={className}
      onMouseEnter={() => showOriginal && isConverted && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {formattedPrice}
      {showOriginal && isConverted && showTooltip && (
        <span className="absolute ml-2 text-xs text-muted-foreground">
          ({formatCurrency(amount, originalCurrency)})
        </span>
      )}
    </span>
  );
}

/**
 * Simple price display without conversion
 * Use when you already have the amount in the correct currency
 */
export function SimplePriceDisplay({
  amount,
  currency,
  className,
}: {
  amount: number;
  currency: string;
  className?: string;
}) {
  return <span className={className}>{formatCurrency(amount, currency)}</span>;
}

