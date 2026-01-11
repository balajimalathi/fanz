"use client";

import { formatCurrency } from "@/lib/currency/currency-utils";

interface PriceDisplayProps {
  amount: number; // Amount in original currency's smallest unit
  originalCurrency: string; // ISO 4217 currency code
  className?: string;
}

/**
 * Price display component
 * Displays prices in the original currency
 */
export function PriceDisplay({
  amount,
  originalCurrency,
  className,
}: PriceDisplayProps) {
  const formattedPrice = formatCurrency(amount, originalCurrency);

  return <span className={className}>{formattedPrice}</span>;
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

