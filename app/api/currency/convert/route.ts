import { NextRequest, NextResponse } from "next/server";
import { convertAmount } from "@/lib/currency/exchange-rate-service";
import { isValidCurrencyCode, normalizeCurrency } from "@/lib/currency/currency-utils";

/**
 * Convert amount between currencies
 * POST /api/currency/convert
 * Body: { amount: 1000, fromCurrency: "USD", toCurrency: "EUR" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, fromCurrency, toCurrency } = body;

    if (typeof amount !== "number" || amount < 0) {
      return NextResponse.json(
        { error: "Invalid amount. Must be a non-negative number" },
        { status: 400 }
      );
    }

    if (!fromCurrency || !toCurrency) {
      return NextResponse.json(
        { error: "Missing 'fromCurrency' or 'toCurrency'" },
        { status: 400 }
      );
    }

    const from = normalizeCurrency(fromCurrency);
    const to = normalizeCurrency(toCurrency);

    if (!isValidCurrencyCode(from) || !isValidCurrencyCode(to)) {
      return NextResponse.json(
        { error: "Invalid currency code" },
        { status: 400 }
      );
    }

    // Get exchange rate for response
    const { getExchangeRate } = await import("@/lib/currency/exchange-rate-service");
    const rateResult = await getExchangeRate(from, to);

    // Convert amount
    const convertedAmount = await convertAmount(amount, from, to);

    return NextResponse.json({
      originalAmount: amount,
      originalCurrency: from,
      convertedAmount,
      targetCurrency: to,
      exchangeRate: rateResult.rate,
      rateSource: rateResult.source,
      rateFetchedAt: rateResult.fetchedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error converting currency:", error);
    return NextResponse.json(
      { error: "Failed to convert currency" },
      { status: 500 }
    );
  }
}

