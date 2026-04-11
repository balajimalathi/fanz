import { getCommandsRedis } from "@/lib/utils/redis-pubsub";

const TTL_SEC = 86_400;

/**
 * @returns true if this webhook event should be processed (first time), false if duplicate.
 */
export async function claimWebhookEvent(eventId: string | undefined): Promise<boolean> {
  if (!eventId) return true;
  try {
    const redis = getCommandsRedis();
    const key = `payment:webhook:${eventId}`;
    const ok = await redis.set(key, "1", "EX", TTL_SEC, "NX");
    // ioredis: "OK" if set, null if key already existed
    return ok === "OK";
  } catch {
    return true;
  }
}
