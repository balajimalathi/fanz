/**
 * Currency utility functions for formatting amounts
 * All amounts in the database are stored in subunits (smallest currency unit)
 * These functions convert subunits to display format with dynamic currency support
 */

import { getCurrencyDecimals, getCurrencySymbol } from "@/lib/currency/currency-utils";

/**
 * Convert subunits to display amount
 * @param amountInSubunits - Amount in smallest currency unit (e.g., paise, cents)
 * @param currency - Currency code (ISO 4217)
 * @returns Amount in display format
 */
export function subunitsToDisplay(amountInSubunits: number, currency: string = "USD"): number {
  const decimals = getCurrencyDecimals(currency);
  return amountInSubunits / Math.pow(10, decimals);
}

/**
 * Format currency from subunits to display format with currency symbol
 * @param amountInSubunits - Amount in smallest currency unit
 * @param currency - Currency code (ISO 4217), defaults to USD
 * @param options - Formatting options
 * @returns Formatted currency string (e.g., "$1,234.56" or "₹500.00")
 */
export function formatCurrency(
  amountInSubunits: number,
  currency: string = "USD",
  options?: {
    showSymbol?: boolean;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  }
): string {
  const {
    showSymbol = true,
    minimumFractionDigits,
    maximumFractionDigits,
  } = options || {};

  const decimals = getCurrencyDecimals(currency);
  const displayAmount = subunitsToDisplay(amountInSubunits, currency);
  
  const defaultMinFraction = currency === "JPY" ? 0 : decimals;
  const defaultMaxFraction = currency === "JPY" ? 0 : decimals;

  const formatted = new Intl.NumberFormat("en-US", {
    style: showSymbol ? "currency" : "decimal",
    currency: currency.toUpperCase(),
    minimumFractionDigits: minimumFractionDigits ?? defaultMinFraction,
    maximumFractionDigits: maximumFractionDigits ?? defaultMaxFraction,
  }).format(displayAmount);

  return formatted;
}

/**
 * Format currency in compact notation (e.g., "$1.2K", "₹5.4M")
 * @param amountInSubunits - Amount in smallest currency unit
 * @param currency - Currency code (ISO 4217), defaults to USD
 * @returns Compact formatted currency string
 */
export function formatCurrencyCompact(amountInSubunits: number, currency: string = "USD"): string {
  const symbol = getCurrencySymbol(currency);
  const displayAmount = subunitsToDisplay(amountInSubunits, currency);
  const decimals = getCurrencyDecimals(currency);

  if (displayAmount >= 10000000) {
    // 10 million and above
    return `${symbol}${(displayAmount / 10000000).toFixed(1)}Cr`;
  } else if (displayAmount >= 100000) {
    // 100 thousand and above
    return `${symbol}${(displayAmount / 100000).toFixed(1)}L`;
  } else if (displayAmount >= 1000) {
    // 1 thousand and above
    return `${symbol}${(displayAmount / 1000).toFixed(1)}K`;
  } else {
    return formatCurrency(amountInSubunits, currency);
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use formatCurrency with currency parameter instead
 */
export function paiseToRupees(amountInPaise: number): number {
  return amountInPaise / 100;
}

