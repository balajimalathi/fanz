import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { gatewayCredentials, gatewayHealth } from "@/lib/db/schema";
import { checkAdminAccess } from "@/lib/utils/admin-auth";

function maskValue(v: unknown): unknown {
  if (typeof v !== "string" || !v) return v;
  if (v.length <= 8) return "****";
  return `${v.slice(0, 4)}…${v.slice(-4)}`;
}

function maskCredentials(creds: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(creds)) {
    out[k] = typeof v === "string" ? maskValue(v) : v;
  }
  return out;
}

export async function GET() {
  const denied = await checkAdminAccess();
  if (denied) return denied;

  const creds = await db.select().from(gatewayCredentials);
  const health = await db.select().from(gatewayHealth);

  return NextResponse.json({
    credentials: creds.map((c) => ({
      ...c,
      credentials: maskCredentials(c.credentials as Record<string, unknown>),
      webhookSecret: c.webhookSecret ? maskValue(c.webhookSecret) : null,
    })),
    health,
  });
}

export async function POST(request: NextRequest) {
  const denied = await checkAdminAccess();
  if (denied) return denied;

  const body = (await request.json()) as {
    gatewayName: string;
    isActive?: boolean;
    mode?: string;
    credentials?: Record<string, unknown>;
    webhookSecret?: string | null;
    supportedCurrencies?: string[];
  };

  if (!body.gatewayName) {
    return NextResponse.json({ error: "gatewayName required" }, { status: 400 });
  }

  const now = new Date();
  await db
    .insert(gatewayCredentials)
    .values({
      gatewayName: body.gatewayName,
      isActive: body.isActive ?? false,
      mode: body.mode === "live" ? "live" : "test",
      credentials: (body.credentials || {}) as Record<string, unknown>,
      webhookSecret: body.webhookSecret ?? null,
      supportedCurrencies: body.supportedCurrencies ?? ["INR"],
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: gatewayCredentials.gatewayName,
      set: {
        isActive: body.isActive ?? false,
        mode: body.mode === "live" ? "live" : "test",
        credentials: (body.credentials || {}) as Record<string, unknown>,
        webhookSecret: body.webhookSecret ?? null,
        supportedCurrencies: body.supportedCurrencies ?? ["INR"],
        updatedAt: now,
      },
    });

  return NextResponse.json({ ok: true });
}
