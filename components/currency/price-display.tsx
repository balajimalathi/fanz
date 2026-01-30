"use client";

import { formatCurrency } from "@/lib/currency/currency-utils";
import { Skeleton } from "@/components/ui/skeleton";

interface PriceDisplayProps {
  amount: number; // Amount in subunits (paise, cents, penny)
  currency?: string; // ISO 4217 currency code
  originalCurrency?: string; // Alias for currency (for backwards compatibility)
  loading?: boolean;
  className?: string;
}

/**
 * Unified price display component
 * Shows shimmer/skeleton when loading - never displays default currency symbol
 */
export function PriceDisplay({
  amount,
  currency: currencyProp,
  originalCurrency,
  loading = false,
  className,
}: PriceDisplayProps) {
  const currency = currencyProp ?? originalCurrency;

  if (loading || !currency) {
    return <Skeleton className="inline-block h-4 w-16 align-baseline" />;
  }
  return <span className={className}>{formatCurrency(amount, currency)}</span>;
}
