import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { userCurrencyPreference } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { isValidCurrencyCode, normalizeCurrency } from "@/lib/currency/currency-utils";

/**
 * Get user's currency preference
 * GET /api/currency/preference
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const preference = await db.query.userCurrencyPreference.findFirst({
      where: (ucp, { eq: eqOp }) => eqOp(ucp.userId, session.user.id),
    });

    if (!preference) {
      return NextResponse.json({ currency: null, source: null });
    }

    return NextResponse.json({
      currency: preference.currency,
      source: preference.detectedFrom,
      updatedAt: preference.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error fetching currency preference:", error);
    return NextResponse.json(
      { error: "Failed to fetch currency preference" },
      { status: 500 }
    );
  }
}

/**
 * Update user's currency preference
 * POST /api/currency/preference
 * Body: { currency: "USD", source: "manual" }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { currency, source = "manual" } = body;

    if (!currency) {
      return NextResponse.json(
        { error: "Currency is required" },
        { status: 400 }
      );
    }

    const normalizedCurrency = normalizeCurrency(currency);
    if (!isValidCurrencyCode(normalizedCurrency)) {
      return NextResponse.json(
        { error: "Invalid currency code" },
        { status: 400 }
      );
    }

    if (!["ip", "browser", "manual"].includes(source)) {
      return NextResponse.json(
        { error: "Invalid source. Must be 'ip', 'browser', or 'manual'" },
        { status: 400 }
      );
    }

    // Upsert preference
    await db
      .insert(userCurrencyPreference)
      .values({
        userId: session.user.id,
        currency: normalizedCurrency,
        detectedFrom: source,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userCurrencyPreference.userId,
        set: {
          currency: normalizedCurrency,
          detectedFrom: source,
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({
      success: true,
      currency: normalizedCurrency,
      source,
    });
  } catch (error) {
    console.error("Error updating currency preference:", error);
    return NextResponse.json(
      { error: "Failed to update currency preference" },
      { status: 500 }
    );
  }
}

