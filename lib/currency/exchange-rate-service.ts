/**
 * Exchange Rate Service
 * Fetches and caches exchange rates from payment processors or public APIs
 */

import { db } from "@/lib/db/client";
import { exchangeRates } from "@/lib/db/schema";
import { eq, desc, and, gte } from "drizzle-orm";
import { BASE_CURRENCY } from "./currency-config";
import { fromSubunits, toSubunits } from "./currency-utils";
import { env } from "@/env";

const RATE_CACHE_DURATION_MS = 4 * 60 * 60 * 1000; // 4 hours

interface ExchangeRateResult {
  rate: number;
  source: "cache" | "processor" | "api";
  fetchedAt: Date;
}

/**
 * Fetch exchange rate from payment processor API
 * Note: This is a placeholder - actual implementation depends on processor APIs
 */
async function fetchRateFromProcessor(
  fromCurrency: string,
  toCurrency: string
): Promise<number | null> {
  // TODO: Implement processor-specific rate fetching
  // CCBill, SegPay, Epoch may provide exchange rates via their APIs
  // For now, return null to use fallback API
  return null;
}

/**
 * Fetch exchange rate from public API (fallback)
 */
async function fetchRateFromAPI(
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  try {
    // Try exchangerate-api.com (free tier available)
    const apiKey = env.EXCHANGE_RATE_API_KEY;
    if (apiKey) {
      const response = await fetch(
        `https://v6.exchangerate-api.com/v6/${apiKey}/pair/${fromCurrency}/${toCurrency}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.conversion_rate) {
          return data.conversion_rate;
        }
      }
    }

    // Fallback to exchangerate.host (no API key required, but rate limited)
    const fallbackResponse = await fetch(
      `https://api.exchangerate.host/latest?base=${fromCurrency}&symbols=${toCurrency}`
    );
    if (fallbackResponse.ok) {
      const data = await fallbackResponse.json();
      if (data.rates && data.rates[toCurrency]) {
        return data.rates[toCurrency];
      }
    }

    // If all APIs fail, return 1.0 (same currency) or throw
    if (fromCurrency === toCurrency) {
      return 1.0;
    }

    throw new Error("Failed to fetch exchange rate from all sources");
  } catch (error) {
    console.error("Error fetching exchange rate from API:", error);
    // Return 1.0 as fallback (assume same value)
    return 1.0;
  }
}

/**
 * Get cached exchange rate from database
 */
async function getCachedRate(
  fromCurrency: string,
  toCurrency: string
): Promise<ExchangeRateResult | null> {
  const cached = await db.query.exchangeRates.findFirst({
    where: (er, { eq: eqOp, and: andOp, gte: gteOp }) =>
      andOp(
        eqOp(er.fromCurrency, fromCurrency),
        eqOp(er.toCurrency, toCurrency),
        gteOp(er.fetchedAt, new Date(Date.now() - RATE_CACHE_DURATION_MS))
      ),
    orderBy: (er, { desc: descOp }) => descOp(er.fetchedAt),
  });

  if (cached) {
    return {
      rate: parseFloat(cached.rate),
      source: "cache",
      fetchedAt: cached.fetchedAt,
    };
  }

  return null;
}

/**
 * Store exchange rate in database cache
 */
async function cacheRate(
  fromCurrency: string,
  toCurrency: string,
  rate: number,
  source: "processor" | "api"
): Promise<void> {
  try {
    await db.insert(exchangeRates).values({
      fromCurrency,
      toCurrency,
      rate: rate.toString(),
      source,
      fetchedAt: new Date(),
    });
  } catch (error) {
    // Ignore duplicate key errors (unique constraint)
    console.error("Error caching exchange rate:", error);
  }
}

/**
 * Get exchange rate between two currencies
 * Uses cache if available, otherwise fetches from API
 */
export async function getExchangeRate(
  fromCurrency: string,
  toCurrency: string
): Promise<ExchangeRateResult> {
  // Normalize currencies
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();

  // Same currency
  if (from === to) {
    return {
      rate: 1.0,
      source: "cache",
      fetchedAt: new Date(),
    };
  }

  // Check cache first
  const cached = await getCachedRate(from, to);
  if (cached) {
    return cached;
  }

  // Try processor API first
  let rate = await fetchRateFromProcessor(from, to);
  let source: "processor" | "api" = "processor";

  // Fallback to public API
  if (!rate) {
    rate = await fetchRateFromAPI(from, to);
    source = "api";
  }

  // Cache the rate
  await cacheRate(from, to, rate, source);

  return {
    rate,
    source,
    fetchedAt: new Date(),
  };
}

/**
 * Convert amount from one currency to another
 * @param amount - Amount in source currency's smallest unit (e.g., cents, paise)
 * @param fromCurrency - Source currency code
 * @param toCurrency - Target currency code
 * @returns Converted amount in target currency's smallest unit
 */
export async function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  // Get exchange rate
  const { rate } = await getExchangeRate(fromCurrency, toCurrency);

  // Convert: first to display amount, apply rate, then back to subunits
  const displayAmount = fromSubunits(amount, fromCurrency);
  const convertedDisplayAmount = displayAmount * rate;
  return toSubunits(convertedDisplayAmount, toCurrency);
}

/**
 * Convert amount to base currency (USD)
 */
export async function convertToBaseCurrency(
  amount: number,
  fromCurrency: string
): Promise<number> {
  return convertAmount(amount, fromCurrency, BASE_CURRENCY);
}

/**
 * Convert amount from base currency (USD)
 */
export async function convertFromBaseCurrency(
  amount: number,
  toCurrency: string
): Promise<number> {
  return convertAmount(amount, BASE_CURRENCY, toCurrency);
}

