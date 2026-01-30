/**
 * Currency Configuration
 * Platform-wide currency settings
 * Supported currencies are configurable for onboarding (payment gateway support varies)
 */

export const SUPPORTED_CURRENCIES = ["INR", "USD", "EUR", "GBP", "AUD", "CAD", "SGD"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

/**
 * Currencies available during creator onboarding
 * Start with INR only; expand as payment gateways support more currencies
 */
export const ONBOARDING_CURRENCIES: SupportedCurrency[] = ["INR"];

/**
 * Default currency for database schema (when creator has not set one yet)
 */
export const DEFAULT_CURRENCY: SupportedCurrency = "INR";

export const CURRENCY_METADATA: Record<
  SupportedCurrency,
  { symbol: string; name: string; decimals: number; subunitName: string }
> = {
  INR: { symbol: "₹", name: "Indian Rupee", decimals: 2, subunitName: "paise" },
  USD: { symbol: "$", name: "US Dollar", decimals: 2, subunitName: "cents" },
  EUR: { symbol: "€", name: "Euro", decimals: 2, subunitName: "cents" },
  GBP: { symbol: "£", name: "British Pound", decimals: 2, subunitName: "penny" },
  AUD: { symbol: "A$", name: "Australian Dollar", decimals: 2, subunitName: "cents" },
  CAD: { symbol: "C$", name: "Canadian Dollar", decimals: 2, subunitName: "cents" },
  SGD: { symbol: "S$", name: "Singapore Dollar", decimals: 2, subunitName: "cents" },
};

export function isSupportedCurrency(currency: string): currency is SupportedCurrency {
  return SUPPORTED_CURRENCIES.includes(currency as SupportedCurrency);
}
