import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { paymentTransaction, fanWalletTransaction } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

// GET - Fetch customer transactions (both payment and wallet transactions)
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");

    const userId = session.user.id;

    // Fetch payment transactions
    const paymentTransactions = await db.query.paymentTransaction.findMany({
      where: (pt, { eq: eqOp }) => eqOp(pt.userId, userId),
      orderBy: (pt, { desc: descOp }) => [descOp(pt.createdAt)],
      limit,
    });

    // Fetch wallet transactions
    const walletTransactions = await db.query.fanWalletTransaction.findMany({
      where: (wt, { eq: eqOp }) => eqOp(wt.userId, userId),
      orderBy: (wt, { desc: descOp }) => [descOp(wt.createdAt)],
      limit,
    });

    return NextResponse.json({
      paymentTransactions: paymentTransactions.map((t) => ({
        id: t.id,
        type: t.type,
        status: t.status,
        amount: t.amount,
        originalCurrency: t.originalCurrency,
        baseCurrency: t.baseCurrency,
        convertedAmount: t.convertedAmount,
        gatewayTransactionId: t.gatewayTransactionId,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
      walletTransactions: walletTransactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        description: t.description,
        paymentTransactionId: t.paymentTransactionId,
        createdAt: t.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Error fetching customer transactions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
