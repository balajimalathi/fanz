/**
 * Currency Configuration
 * Platform-wide currency settings and mappings
 */

export const BASE_CURRENCY = "USD";

/**
 * Supported currencies list (ISO 4217 codes)
 * Focus on major currencies for global platforms
 */
export const SUPPORTED_CURRENCIES = [
  "USD", // US Dollar
  "EUR", // Euro
  "GBP", // British Pound
  "INR", // Indian Rupee
  "CAD", // Canadian Dollar
  "AUD", // Australian Dollar
  "JPY", // Japanese Yen
  "CNY", // Chinese Yuan
  "SGD", // Singapore Dollar
  "AED", // UAE Dirham
  "SAR", // Saudi Riyal
  "BRL", // Brazilian Real
  "MXN", // Mexican Peso
  "ZAR", // South African Rand
  "NZD", // New Zealand Dollar
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

/**
 * Country to Currency mapping (ISO 3166-1 alpha-2 to ISO 4217)
 * Common mappings for currency detection
 */
export const COUNTRY_TO_CURRENCY: Record<string, string> = {
  US: "USD",
  GB: "GBP",
  IN: "INR",
  CA: "CAD",
  AU: "AUD",
  JP: "JPY",
  CN: "CNY",
  SG: "SGD",
  AE: "AED",
  SA: "SAR",
  BR: "BRL",
  MX: "MXN",
  ZA: "ZAR",
  NZ: "NZD",
  // European Union countries
  AT: "EUR", // Austria
  BE: "EUR", // Belgium
  FI: "EUR", // Finland
  FR: "EUR", // France
  DE: "EUR", // Germany
  GR: "EUR", // Greece
  IE: "EUR", // Ireland
  IT: "EUR", // Italy
  NL: "EUR", // Netherlands
  PT: "EUR", // Portugal
  ES: "EUR", // Spain
  // Add more as needed
};

/**
 * Validate if a currency code is supported
 */
export function isSupportedCurrency(currency: string): currency is SupportedCurrency {
  return SUPPORTED_CURRENCIES.includes(currency as SupportedCurrency);
}

/**
 * Get currency from country code
 */
export function getCurrencyFromCountry(countryCode: string): string {
  return COUNTRY_TO_CURRENCY[countryCode.toUpperCase()] || BASE_CURRENCY;
}

