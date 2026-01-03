import { NextRequest, NextResponse } from "next/server";
import { detectCurrency } from "@/lib/currency/currency-detection";

/**
 * Detect user's currency based on IP address and browser settings
 * GET /api/currency/detect
 */
export async function GET(request: NextRequest) {
  try {
    // Get IP address from request headers
    const forwardedFor = request.headers.get("x-forwarded-for");
    const realIP = request.headers.get("x-real-ip");
    const ipAddress = forwardedFor?.split(",")[0] || realIP || undefined;

    // Get browser locale from Accept-Language header
    const acceptLanguage = request.headers.get("accept-language");
    const browserLocale = acceptLanguage?.split(",")[0] || undefined;

    // Detect currency
    const result = await detectCurrency(ipAddress, browserLocale);

    return NextResponse.json({
      currency: result.currency,
      source: result.source,
      confidence: result.confidence,
      countryCode: result.countryCode,
    });
  } catch (error) {
    console.error("Error detecting currency:", error);
    return NextResponse.json(
      { error: "Failed to detect currency" },
      { status: 500 }
    );
  }
}

