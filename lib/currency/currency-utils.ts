/**
 * Currency Utilities
 * Unified functions for currency formatting and conversion
 * All amounts are stored in subunits (paise, cents, penny)
 * Use formatCurrency() for display - the single source for amount formatting
 */

import {
  CURRENCY_METADATA,
  DEFAULT_CURRENCY,
  isSupportedCurrency,
  type SupportedCurrency,
} from "@/lib/currency/currency-config";

function getCurrencyMetadata(currency: string) {
  const upper = currency.toUpperCase().trim();
  if (isSupportedCurrency(upper)) {
    return CURRENCY_METADATA[upper];
  }
  return {
    symbol: upper,
    name: upper,
    decimals: 2,
    subunitName: "subunit",
  };
}

/**
 * Get currency symbol (never hardcode - use this)
 */
export function getCurrencySymbol(currency: string): string {
  return getCurrencyMetadata(currency).symbol;
}

/**
 * Get number of decimal places for a currency
 */
export function getCurrencyDecimals(currency: string): number {
  return getCurrencyMetadata(currency).decimals;
}

/**
 * Convert amount from subunits (paise, cents, penny) to display amount
 * @param amountInSubunits - Amount in smallest currency unit
 * @param currency - Currency code (required)
 * @returns Display amount (e.g., 10.50 for 1050 subunits)
 */
export function fromSubunits(amountInSubunits: number, currency: string): number {
  const decimals = getCurrencyDecimals(currency);
  return amountInSubunits / Math.pow(10, decimals);
}

/**
 * Convert display amount to subunits (paise, cents, penny)
 * @param displayAmount - Display amount (e.g., 10.50)
 * @param currency - Currency code (required)
 * @returns Amount in smallest currency unit
 */
export function toSubunits(displayAmount: number, currency: string): number {
  const decimals = getCurrencyDecimals(currency);
  return Math.round(displayAmount * Math.pow(10, decimals));
}

/**
 * Format currency for display - THE single function for displaying amounts
 * @param amountInSubunits - Amount in smallest currency unit
 * @param currency - Currency code (required, no default)
 * @param options - Formatting options
 * @returns Formatted string (e.g., "₹99.00" or "$10.50")
 */
export function formatCurrency(
  amountInSubunits: number,
  currency: string,
  options?: {
    showSymbol?: boolean;
    locale?: string;
  }
): string {
  const metadata = getCurrencyMetadata(currency);
  const displayAmount = fromSubunits(amountInSubunits, currency);
  const locale = options?.locale ?? "en-US";

  const formatter = new Intl.NumberFormat(locale, {
    style: options?.showSymbol !== false ? "currency" : "decimal",
    currency: currency.toUpperCase(),
    minimumFractionDigits: metadata.decimals,
    maximumFractionDigits: metadata.decimals,
  });

  return formatter.format(displayAmount);
}

/**
 * Format currency in compact notation (e.g., "₹1.2L", "$5.4K")
 */
export function formatCurrencyCompact(
  amountInSubunits: number,
  currency: string
): string {
  if (currency === "-") return "-";

  const symbol = getCurrencySymbol(currency);
  const displayAmount = fromSubunits(amountInSubunits, currency);

  if (displayAmount >= 10000000) {
    return `${symbol}${(displayAmount / 10000000).toFixed(1)}Cr`;
  }
  if (displayAmount >= 100000) {
    return `${symbol}${(displayAmount / 100000).toFixed(1)}L`;
  }
  if (displayAmount >= 1000) {
    return `${symbol}${(displayAmount / 1000).toFixed(1)}K`;
  }
  return formatCurrency(amountInSubunits, currency);
}

export function isValidCurrencyCode(currency: string): boolean {
  return /^[A-Z]{3}$/.test(currency.toUpperCase());
}

export function normalizeCurrency(currency: string): string {
  return currency.toUpperCase().trim();
}

export { isSupportedCurrency, DEFAULT_CURRENCY };
export type { SupportedCurrency };
