/**
 * Server-side utility to get creator currency
 * Use this in server components and API routes to get the creator's currency
 */

import { db } from "@/lib/db/client";
import { creator } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { DEFAULT_CURRENCY } from "@/lib/currency/currency-config";

/**
 * Get creator's currency from database
 * @param creatorId - The creator's user ID
 * @returns The creator's currency code (ISO 4217)
 */
export async function getCreatorCurrency(creatorId: string): Promise<string> {
  try {
    const creatorRecord = await db.query.creator.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, creatorId),
      columns: {
        currency: true,
      },
    });

    return creatorRecord?.currency ?? DEFAULT_CURRENCY;
  } catch (error) {
    console.error("Error fetching creator currency:", error);
    return DEFAULT_CURRENCY;
  }
}
