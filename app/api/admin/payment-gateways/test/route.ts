import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/utils/admin-auth";
import { GatewayRegistry } from "@/lib/payments/gateway/gateway-registry";

export async function POST(request: NextRequest) {
  const denied = await checkAdminAccess();
  if (denied) return denied;

  const { gatewayName } = (await request.json()) as { gatewayName?: string };
  if (!gatewayName) {
    return NextResponse.json({ error: "gatewayName required" }, { status: 400 });
  }

  try {
    const adapter = await GatewayRegistry.getGateway(gatewayName);
    if (!adapter) {
      return NextResponse.json({ ok: false, error: "Gateway not configured" }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      gateway: adapter.getName(),
      currencies: adapter.getSupportedCurrencies(),
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    );
  }
}
