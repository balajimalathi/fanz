/**
 * Currency Detection Service
 * Detects user's currency based on IP geolocation and browser settings
 */

import { getCurrencyFromCountry } from "./currency-config";
import { BASE_CURRENCY } from "./currency-config";

export type DetectionSource = "ip" | "browser" | "manual";

export interface CurrencyDetectionResult {
  currency: string;
  source: DetectionSource;
  confidence: "high" | "medium" | "low";
  countryCode?: string;
}

/**
 * Detect currency from IP address using geolocation
 * Uses free services like ipapi.co or Cloudflare headers
 */
export async function detectCurrencyFromIP(
  ipAddress?: string
): Promise<CurrencyDetectionResult> {
  try {
    // Try Cloudflare headers first (if using Cloudflare)
    const cfCountry = process.env.CF_IPCOUNTRY; // Set by Cloudflare
    if (cfCountry) {
      const currency = getCurrencyFromCountry(cfCountry);
      return {
        currency,
        source: "ip",
        confidence: "high",
        countryCode: cfCountry,
      };
    }

    // Fallback to IP geolocation API
    // Using ipapi.co (free tier: 1000 requests/day)
    const ip = ipAddress || "check"; // "check" uses request IP
    const response = await fetch(`https://ipapi.co/${ip}/json/`, {
      headers: {
        "User-Agent": "Currency-Detection-Service",
      },
    });

    if (!response.ok) {
      throw new Error("IP geolocation failed");
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(data.reason || "IP geolocation error");
    }

    const countryCode = data.country_code;
    const currency = data.currency || getCurrencyFromCountry(countryCode);

    return {
      currency: currency.toUpperCase(),
      source: "ip",
      confidence: countryCode ? "high" : "medium",
      countryCode,
    };
  } catch (error) {
    console.error("Error detecting currency from IP:", error);
    // Fallback to base currency
    return {
      currency: BASE_CURRENCY,
      source: "ip",
      confidence: "low",
    };
  }
}

/**
 * Detect currency from browser locale
 */
export function detectCurrencyFromBrowser(locale?: string): CurrencyDetectionResult {
  try {
    const browserLocale = locale || (typeof navigator !== "undefined" ? navigator.language : "en-US");
    
    // Extract country code from locale (e.g., "en-US" -> "US")
    const parts = browserLocale.split("-");
    const countryCode = parts.length > 1 ? parts[1] : parts[0];

    // Try to get currency from locale
    const formatter = new Intl.NumberFormat(browserLocale, {
      style: "currency",
      currency: "USD", // Dummy, we'll extract the resolved currency
    });

    // Get currency from resolved options
    const resolvedOptions = formatter.resolvedOptions();
    const currency = resolvedOptions.currency || getCurrencyFromCountry(countryCode);

    return {
      currency: currency.toUpperCase(),
      source: "browser",
      confidence: "medium",
      countryCode,
    };
  } catch (error) {
    console.error("Error detecting currency from browser:", error);
    return {
      currency: BASE_CURRENCY,
      source: "browser",
      confidence: "low",
    };
  }
}

/**
 * Main currency detection function
 * Tries IP detection first, falls back to browser locale
 */
export async function detectCurrency(
  ipAddress?: string,
  browserLocale?: string
): Promise<CurrencyDetectionResult> {
  // Try IP detection first (more accurate)
  const ipResult = await detectCurrencyFromIP(ipAddress);
  if (ipResult.confidence === "high") {
    return ipResult;
  }

  // Fallback to browser locale
  const browserResult = detectCurrencyFromBrowser(browserLocale);
  if (browserResult.confidence === "medium" || browserResult.confidence === "high") {
    return browserResult;
  }

  // Final fallback
  return ipResult.confidence === "medium" ? ipResult : browserResult;
}

