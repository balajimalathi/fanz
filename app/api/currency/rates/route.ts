import { NextRequest, NextResponse } from "next/server";
import { getExchangeRate } from "@/lib/currency/exchange-rate-service";

/**
 * Get exchange rate between two currencies
 * GET /api/currency/rates?from=USD&to=EUR
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!from || !to) {
      return NextResponse.json(
        { error: "Missing 'from' or 'to' currency parameter" },
        { status: 400 }
      );
    }

    const result = await getExchangeRate(from, to);

    return NextResponse.json({
      from: from.toUpperCase(),
      to: to.toUpperCase(),
      rate: result.rate,
      source: result.source,
      fetchedAt: result.fetchedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error fetching exchange rate:", error);
    return NextResponse.json(
      { error: "Failed to fetch exchange rate" },
      { status: 500 }
    );
  }
}

