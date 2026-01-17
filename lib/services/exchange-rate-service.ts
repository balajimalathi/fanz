import { db } from "@/lib/db/client";
import { exchangeRates } from "@/lib/db/schema";
import { env } from "@/env";

export class ExchangeRateService {
  /**
   * Get exchange rate (cached or fetch new)
   * @param fromCurrency - Source currency (e.g., "USD")
   * @param toCurrency - Target currency (e.g., "INR")
   * @param date - Optional date for historical rate (defaults to today)
   * @returns Exchange rate as decimal
   */
  static async getExchangeRate(
    fromCurrency: string,
    toCurrency: string,
    date?: Date
  ): Promise<number> {
    // If same currency, return 1.0
    if (fromCurrency === toCurrency) {
      return 1.0;
    }

    const targetDate = date || new Date();
    const dateKey = targetDate.toISOString().split("T")[0]; // YYYY-MM-DD

    // Try to get cached rate (most recent for the date or before)
    const cachedRate = await db.query.exchangeRates.findFirst({
      where: (er, { eq: eqOp, and: andOp, lte: lteOp }) =>
        andOp(
          eqOp(er.fromCurrency, fromCurrency),
          eqOp(er.toCurrency, toCurrency)
        ),
      orderBy: (er, { desc: descOp }) => [descOp(er.fetchedAt)],
    });

    // If we have a recent rate (within 24 hours), use it
    if (cachedRate) {
      const rateAge = Date.now() - new Date(cachedRate.fetchedAt).getTime();
      const oneDay = 24 * 60 * 60 * 1000;

      if (rateAge < oneDay) {
        return parseFloat(cachedRate.rate);
      }
    }

    // Fetch new rate
    const newRate = await this.fetchAndStoreRate(fromCurrency, toCurrency);
    return newRate;
  }

  /**
   * Fetch exchange rate from API and store in database
   * @param fromCurrency - Source currency
   * @param toCurrency - Target currency
   * @returns Exchange rate as number
   */
  static async fetchAndStoreRate(
    fromCurrency: string,
    toCurrency: string
  ): Promise<number> {
    try {
      // If API key is available, fetch from exchange rate API
      if (env.EXCHANGE_RATE_API_KEY) {
        // Using exchangerate-api.com or similar
        // For now, using a free tier API endpoint
        const response = await fetch(
          `https://api.exchangerate-api.com/v4/latest/${fromCurrency}`
        );

        if (response.ok) {
          const data = await response.json();
          const rate = data.rates?.[toCurrency];

          if (rate && typeof rate === "number") {
            // Store in database
            await db.insert(exchangeRates).values({
              fromCurrency,
              toCurrency,
              rate: rate.toString(),
              source: "api",
            });

            return rate;
          }
        }
      }

      // Fallback: Use 1.0 rate (no conversion) if API unavailable
      console.warn(
        `Exchange rate API unavailable or invalid. Using 1.0 for ${fromCurrency} → ${toCurrency}`
      );

      const fallbackRate = 1.0;
      await db.insert(exchangeRates).values({
        fromCurrency,
        toCurrency,
        rate: fallbackRate.toString(),
        source: "fallback",
      });

      return fallbackRate;
    } catch (error) {
      console.error("Error fetching exchange rate:", error);

      // Fallback to 1.0
      const fallbackRate = 1.0;
      try {
        await db.insert(exchangeRates).values({
          fromCurrency,
          toCurrency,
          rate: fallbackRate.toString(),
          source: "fallback",
        });
      } catch (dbError) {
        console.error("Error storing fallback rate:", dbError);
      }

      return fallbackRate;
    }
  }

  /**
   * Convert amount from one currency to another
   * @param amount - Amount in source currency subunits
   * @param fromCurrency - Source currency
   * @param toCurrency - Target currency
   * @param date - Optional date for historical conversion
   * @returns Amount in target currency subunits
   */
  static async convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    date?: Date
  ): Promise<number> {
    const rate = await this.getExchangeRate(fromCurrency, toCurrency, date);
    return Math.round(amount * rate);
  }

  /**
   * Get historical exchange rate (for a specific date)
   * @param fromCurrency - Source currency
   * @param toCurrency - Target currency
   * @param date - Date to get rate for
   * @returns Exchange rate as number
   */
  static async getHistoricalRate(
    fromCurrency: string,
    toCurrency: string,
    date: Date
  ): Promise<number> {
    // Try to find rate for that specific date
    const historicalRate = await db.query.exchangeRates.findFirst({
      where: (er, { eq: eqOp, and: andOp, lte: lteOp, gte: gteOp }) =>
        andOp(
          eqOp(er.fromCurrency, fromCurrency),
          eqOp(er.toCurrency, toCurrency),
          lteOp(er.fetchedAt, date)
        ),
      orderBy: (er, { desc: descOp }) => [descOp(er.fetchedAt)],
    });

    if (historicalRate) {
      return parseFloat(historicalRate.rate);
    }

    // If not found, use current rate (fallback)
    return await this.getExchangeRate(fromCurrency, toCurrency);
  }
}
