import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { paymentAttempt, paymentTransaction } from "@/lib/db/schema";
import type { PaymentType } from "@/lib/payments/payment-service";
import type { PaymentInitiationRequest, PaymentInitiationResponse } from "./adapters/base-gateway";
import { CircuitBreaker } from "./circuit-breaker";
import { GatewayRouteResolver } from "./route-resolver";
import { GatewayRegistry } from "./gateway-registry";

const INIT_TIMEOUT_MS = 25_000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("Gateway timeout")), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

async function insertAttempt(
  transactionId: string,
  gatewayName: string,
  attemptNumber: number,
  status: string,
  gatewayTransactionId: string | null,
  errorMessage: string | null,
  latencyMs: number
): Promise<void> {
  await db.insert(paymentAttempt).values({
    transactionId,
    gatewayName,
    attemptNumber,
    status,
    gatewayTransactionId,
    errorMessage,
    latencyMs,
  });
}

export class PaymentOrchestrator {
  static async initiatePayment(
    request: PaymentInitiationRequest,
    paymentType: PaymentType,
    internalTransactionId: string
  ): Promise<PaymentInitiationResponse & { gatewayName?: string }> {
    const chain = await GatewayRouteResolver.resolveGatewayChain(
      paymentType,
      request.currency,
      request.amount
    );
    if (chain.length === 0) {
      return { success: false, error: "No payment gateways available for this currency" };
    }

    let attemptNo = 0;
    const lastErrors: string[] = [];

    for (const gwName of chain) {
      attemptNo += 1;
      const can = await CircuitBreaker.canUseGateway(gwName);
      if (!can) continue;

      const adapter = await GatewayRegistry.getGateway(gwName);
      if (!adapter) continue;

      const start = Date.now();
      try {
        const res = await withTimeout(
          adapter.initiatePayment({
            ...request,
            idempotencyKey: request.idempotencyKey,
          }),
          INIT_TIMEOUT_MS
        );
        const latency = Date.now() - start;

        if (res.success && res.paymentUrl && res.transactionId) {
          await CircuitBreaker.recordSuccess(gwName);
          await insertAttempt(
            internalTransactionId,
            gwName,
            attemptNo,
            "redirected",
            res.transactionId,
            null,
            latency
          );
          await db
            .update(paymentTransaction)
            .set({
              gatewayName: gwName,
              gatewayTransactionId: res.transactionId,
              attemptCount: attemptNo,
              updatedAt: new Date(),
            })
            .where(eq(paymentTransaction.id, internalTransactionId));

          return { ...res, gatewayName: gwName };
        }

        await CircuitBreaker.recordFailure(gwName);
        const err = res.error || "Gateway returned failure";
        lastErrors.push(`${gwName}: ${err}`);
        await insertAttempt(internalTransactionId, gwName, attemptNo, "failed", null, err, latency);
      } catch (e) {
        await CircuitBreaker.recordFailure(gwName);
        const msg = e instanceof Error ? e.message : String(e);
        lastErrors.push(`${gwName}: ${msg}`);
        await insertAttempt(
          internalTransactionId,
          gwName,
          attemptNo,
          "timeout",
          null,
          msg,
          Date.now() - start
        );
      }
    }

    await db
      .update(paymentTransaction)
      .set({
        attemptCount: attemptNo,
        updatedAt: new Date(),
      })
      .where(eq(paymentTransaction.id, internalTransactionId));

    return {
      success: false,
      error: lastErrors.length ? lastErrors.join(" | ") : "All payment gateways failed",
    };
  }
}
