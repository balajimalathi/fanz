import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { gatewayHealth } from "@/lib/db/schema";
import { getCommandsRedis } from "@/lib/utils/redis-pubsub";

const FAILURE_THRESHOLD = 5;
const CIRCUIT_OPEN_SECONDS = 60;
const REDIS_PREFIX = "payment:gw:circuit:";

export type GatewayHealthStatus = "healthy" | "degraded" | "down";

export class CircuitBreaker {
  static redisKey(gatewayName: string): string {
    return `${REDIS_PREFIX}${gatewayName}`;
  }

  static async canUseGateway(gatewayName: string): Promise<boolean> {
    try {
      const redis = getCommandsRedis();
      const blocked = await redis.get(this.redisKey(gatewayName));
      if (blocked === "1") return false;
    } catch {
      // Redis optional
    }

    const row = await db.query.gatewayHealth.findFirst({
      where: (g, { eq: eqOp }) => eqOp(g.gatewayName, gatewayName),
    });
    if (!row?.circuitOpenUntil) return true;
    return row.circuitOpenUntil.getTime() <= Date.now();
  }

  static async recordSuccess(gatewayName: string): Promise<void> {
    try {
      const redis = getCommandsRedis();
      await redis.del(this.redisKey(gatewayName));
    } catch {
      /* ignore */
    }

    const existing = await db.query.gatewayHealth.findFirst({
      where: (g, { eq: eqOp }) => eqOp(g.gatewayName, gatewayName),
    });
    const now = new Date();
    if (!existing) {
      await db.insert(gatewayHealth).values({
        gatewayName,
        status: "healthy",
        failureCount: 0,
        lastSuccessAt: now,
        circuitOpenUntil: null,
        updatedAt: now,
      });
      return;
    }
    await db
      .update(gatewayHealth)
      .set({
        status: "healthy",
        failureCount: 0,
        lastSuccessAt: now,
        circuitOpenUntil: null,
        updatedAt: now,
      })
      .where(eq(gatewayHealth.gatewayName, gatewayName));
  }

  static async recordFailure(gatewayName: string): Promise<void> {
    const existing = await db.query.gatewayHealth.findFirst({
      where: (g, { eq: eqOp }) => eqOp(g.gatewayName, gatewayName),
    });
    const now = new Date();
    const failures = (existing?.failureCount ?? 0) + 1;
    let circuitOpenUntil: Date | null = existing?.circuitOpenUntil ?? null;
    let status: GatewayHealthStatus = failures >= 3 ? "degraded" : "healthy";
    if (failures >= FAILURE_THRESHOLD) {
      circuitOpenUntil = new Date(now.getTime() + CIRCUIT_OPEN_SECONDS * 1000);
      status = "down";
      try {
        const redis = getCommandsRedis();
        await redis.set(this.redisKey(gatewayName), "1", "EX", CIRCUIT_OPEN_SECONDS);
      } catch {
        /* ignore */
      }
    }

    if (!existing) {
      await db.insert(gatewayHealth).values({
        gatewayName,
        status,
        failureCount: failures,
        lastFailureAt: now,
        circuitOpenUntil,
        updatedAt: now,
      });
      return;
    }

    await db
      .update(gatewayHealth)
      .set({
        status,
        failureCount: failures,
        lastFailureAt: now,
        circuitOpenUntil,
        updatedAt: now,
      })
      .where(eq(gatewayHealth.gatewayName, gatewayName));
  }

  static async getHealthStatus(gatewayName: string): Promise<GatewayHealthStatus> {
    const row = await db.query.gatewayHealth.findFirst({
      where: (g, { eq: eqOp }) => eqOp(g.gatewayName, gatewayName),
    });
    return (row?.status as GatewayHealthStatus) || "healthy";
  }
}
