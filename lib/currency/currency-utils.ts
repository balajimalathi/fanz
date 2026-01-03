/**
 * Currency Utilities
 * Helper functions for currency formatting, conversion, and validation
 */

import { BASE_CURRENCY } from "./currency-config";

/**
 * Currency metadata
 * Decimal places and formatting information for each currency
 */
export const CURRENCY_METADATA: Record<
  string,
  {
    symbol: string;
    name: string;
    decimals: number;
    symbolPosition: "before" | "after";
  }
> = {
  USD: { symbol: "$", name: "US Dollar", decimals: 2, symbolPosition: "before" },
  EUR: { symbol: "€", name: "Euro", decimals: 2, symbolPosition: "before" },
  GBP: { symbol: "£", name: "British Pound", decimals: 2, symbolPosition: "before" },
  INR: { symbol: "₹", name: "Indian Rupee", decimals: 2, symbolPosition: "before" },
  CAD: { symbol: "C$", name: "Canadian Dollar", decimals: 2, symbolPosition: "before" },
  AUD: { symbol: "A$", name: "Australian Dollar", decimals: 2, symbolPosition: "before" },
  JPY: { symbol: "¥", name: "Japanese Yen", decimals: 0, symbolPosition: "before" },
  CNY: { symbol: "¥", name: "Chinese Yuan", decimals: 2, symbolPosition: "before" },
  SGD: { symbol: "S$", name: "Singapore Dollar", decimals: 2, symbolPosition: "before" },
  AED: { symbol: "د.إ", name: "UAE Dirham", decimals: 2, symbolPosition: "before" },
  SAR: { symbol: "﷼", name: "Saudi Riyal", decimals: 2, symbolPosition: "before" },
  BRL: { symbol: "R$", name: "Brazilian Real", decimals: 2, symbolPosition: "before" },
  MXN: { symbol: "$", name: "Mexican Peso", decimals: 2, symbolPosition: "before" },
  ZAR: { symbol: "R", name: "South African Rand", decimals: 2, symbolPosition: "before" },
  NZD: { symbol: "NZ$", name: "New Zealand Dollar", decimals: 2, symbolPosition: "before" },
};

/**
 * Get currency metadata
 */
export function getCurrencyMetadata(currency: string) {
  return (
    CURRENCY_METADATA[currency.toUpperCase()] || {
      symbol: currency,
      name: currency,
      decimals: 2,
      symbolPosition: "before" as const,
    }
  );
}

/**
 * Get currency symbol
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
 * Convert amount from subunits (e.g., cents, paise) to display amount
 * @param amountInSubunits - Amount in smallest currency unit
 * @param currency - Currency code
 * @returns Display amount (e.g., 10.50 for 1050 cents)
 */
export function fromSubunits(amountInSubunits: number, currency: string): number {
  const decimals = getCurrencyDecimals(currency);
  return amountInSubunits / Math.pow(10, decimals);
}

/**
 * Convert display amount to subunits (e.g., cents, paise)
 * @param displayAmount - Display amount (e.g., 10.50)
 * @param currency - Currency code
 * @returns Amount in smallest currency unit (e.g., 1050 cents)
 */
export function toSubunits(displayAmount: number, currency: string): number {
  const decimals = getCurrencyDecimals(currency);
  return Math.round(displayAmount * Math.pow(10, decimals));
}

/**
 * Format currency for display
 * @param amountInSubunits - Amount in smallest currency unit
 * @param currency - Currency code (ISO 4217)
 * @param options - Formatting options
 * @returns Formatted string (e.g., "$10.50" or "₹500.00")
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
  const locale = options?.locale || "en-US";

  // Use Intl.NumberFormat for proper localization
  const formatter = new Intl.NumberFormat(locale, {
    style: options?.showSymbol !== false ? "currency" : "decimal",
    currency: currency.toUpperCase(),
    minimumFractionDigits: metadata.decimals,
    maximumFractionDigits: metadata.decimals,
  });

  if (options?.showSymbol === false) {
    // Return just the number without currency symbol
    return formatter.format(displayAmount);
  }

  return formatter.format(displayAmount);
}

/**
 * Validate currency code (ISO 4217)
 */
export function isValidCurrencyCode(currency: string): boolean {
  return /^[A-Z]{3}$/.test(currency.toUpperCase());
}

/**
 * Normalize currency code to uppercase
 */
export function normalizeCurrency(currency: string): string {
  return currency.toUpperCase().trim();
}

