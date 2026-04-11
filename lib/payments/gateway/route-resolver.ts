import { and, asc, eq, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { gatewayCredentials, paymentGatewayConfig } from "@/lib/db/schema";
import type { PaymentType } from "@/lib/payments/payment-service";
import { GatewayRegistry } from "./gateway-registry";

const DEFAULT_ORDER = ["stripe", "razorpay", "paytm", "paypal", "dodo"] as const;

export class GatewayRouteResolver {
  static async resolveGatewayChain(
    paymentType: PaymentType,
    currency: string,
    _amount: number
  ): Promise<string[]> {
    const upper = currency.toUpperCase();
    const rows = await db
      .select({
        gatewayName: paymentGatewayConfig.gatewayName,
        priority: paymentGatewayConfig.priority,
      })
      .from(paymentGatewayConfig)
      .where(
        and(
          eq(paymentGatewayConfig.isEnabled, true),
          or(eq(paymentGatewayConfig.paymentType, paymentType), eq(paymentGatewayConfig.paymentType, "*"))
        )
      )
      .orderBy(asc(paymentGatewayConfig.priority), asc(paymentGatewayConfig.gatewayName));

    const fromDb = rows.map((r) => r.gatewayName);
    const base = fromDb.length > 0 ? fromDb : [...DEFAULT_ORDER];

    const activeRows = await db
      .select({ gatewayName: gatewayCredentials.gatewayName })
      .from(gatewayCredentials)
      .where(eq(gatewayCredentials.isActive, true));
    const dbActive = new Set(activeRows.map((r) => r.gatewayName));

    const ordered: string[] = [];
    const seen = new Set<string>();

    const consider = async (name: string) => {
      if (seen.has(name)) return;
      const envOk = GatewayRegistry.isConfigured(name);
      const dbOk = dbActive.has(name);
      if (!envOk && !dbOk) return;
      const adapter = await GatewayRegistry.getGateway(name);
      if (!adapter) return;
      if (!adapter.supportsCurrency(upper)) return;
      seen.add(name);
      ordered.push(name);
    };

    for (const g of base) {
      await consider(g);
    }
    for (const g of DEFAULT_ORDER) {
      await consider(g);
    }

    return ordered;
  }
}
