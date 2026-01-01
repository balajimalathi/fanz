import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { paymentTransaction } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { transactionId } = await params;

    const transaction = await db.query.paymentTransaction.findFirst({
      where: (pt, { eq: eqOp, and: andOp }) =>
        andOp(eqOp(pt.id, transactionId), eqOp(pt.userId, session.user.id)),
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: transaction.id,
      type: transaction.type,
      status: transaction.status,
      amount: transaction.amount / 100, // Convert paise to rupees
      createdAt: transaction.createdAt.toISOString(),
      updatedAt: transaction.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error fetching payment status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

