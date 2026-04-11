import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { gatewayHealth } from "@/lib/db/schema";
import { checkAdminAccess } from "@/lib/utils/admin-auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ gateway: string }> }
) {
  const denied = await checkAdminAccess();
  if (denied) return denied;

  const { gateway } = await params;
  const row = await db.query.gatewayHealth.findFirst({
    where: (g, { eq: eqOp }) => eqOp(g.gatewayName, gateway),
  });

  return NextResponse.json({ health: row || null });
}
