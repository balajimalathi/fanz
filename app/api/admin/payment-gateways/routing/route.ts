import { NextRequest, NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { paymentGatewayConfig } from "@/lib/db/schema";
import { checkAdminAccess } from "@/lib/utils/admin-auth";

export async function GET() {
  const denied = await checkAdminAccess();
  if (denied) return denied;

  const rows = await db
    .select()
    .from(paymentGatewayConfig)
    .orderBy(asc(paymentGatewayConfig.paymentType), asc(paymentGatewayConfig.priority));

  return NextResponse.json({ routing: rows });
}

export async function PUT(request: NextRequest) {
  const denied = await checkAdminAccess();
  if (denied) return denied;

  const body = (await request.json()) as {
    items: {
      gatewayName: string;
      paymentType: string;
      priority: number;
      isEnabled?: boolean;
    }[];
  };

  if (!body.items?.length) {
    return NextResponse.json({ error: "items required" }, { status: 400 });
  }

  await db.delete(paymentGatewayConfig);

  const now = new Date();
  for (const it of body.items) {
    await db.insert(paymentGatewayConfig).values({
      gatewayName: it.gatewayName,
      paymentType: it.paymentType,
      priority: it.priority,
      isEnabled: it.isEnabled !== false,
      createdAt: now,
      updatedAt: now,
    });
  }

  return NextResponse.json({ ok: true });
}
