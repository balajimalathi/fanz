import { db } from "@/lib/db/client";
import { creatorPricing } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export interface CreatorPricingData {
  dmTextPrice: number;
  dmImagePrice: number;
  dmVideoPrice: number;
  audioCallPricePerMinute: number;
  videoCallPricePerMinute: number;
  liveStreamEntryPrice: number;
}

export class CreatorPricingService {
  /**
   * Get creator's pricing settings
   */
  static async getPricing(creatorId: string): Promise<CreatorPricingData | null> {
    const pricing = await db.query.creatorPricing.findFirst({
      where: (p, { eq: eqOp }) => eqOp(p.creatorId, creatorId),
    });

    if (!pricing) {
      return null;
    }

    return {
      dmTextPrice: pricing.dmTextPrice,
      dmImagePrice: pricing.dmImagePrice,
      dmVideoPrice: pricing.dmVideoPrice,
      audioCallPricePerMinute: pricing.audioCallPricePerMinute,
      videoCallPricePerMinute: pricing.videoCallPricePerMinute,
      liveStreamEntryPrice: pricing.liveStreamEntryPrice,
    };
  }

  /**
   * Get or create pricing settings for creator
   */
  static async getOrCreatePricing(creatorId: string): Promise<CreatorPricingData> {
    let pricing = await this.getPricing(creatorId);

    if (!pricing) {
      // Create default pricing
      const [newPricing] = await db
        .insert(creatorPricing)
        .values({
          creatorId,
          dmTextPrice: 0,
          dmImagePrice: 0,
          dmVideoPrice: 0,
          audioCallPricePerMinute: 0,
          videoCallPricePerMinute: 0,
          liveStreamEntryPrice: 0,
        })
        .returning();

      pricing = {
        dmTextPrice: newPricing.dmTextPrice,
        dmImagePrice: newPricing.dmImagePrice,
        dmVideoPrice: newPricing.dmVideoPrice,
        audioCallPricePerMinute: newPricing.audioCallPricePerMinute,
        videoCallPricePerMinute: newPricing.videoCallPricePerMinute,
        liveStreamEntryPrice: newPricing.liveStreamEntryPrice,
      };
    }

    return pricing;
  }

  /**
   * Update pricing settings (creator only)
   */
  static async updatePricing(
    creatorId: string,
    pricing: Partial<CreatorPricingData>
  ): Promise<CreatorPricingData> {
    // Get or create pricing
    await this.getOrCreatePricing(creatorId);

    // Update pricing
    const [updated] = await db
      .update(creatorPricing)
      .set({
        ...pricing,
        updatedAt: new Date(),
      })
      .where(eq(creatorPricing.creatorId, creatorId))
      .returning();

    return {
      dmTextPrice: updated.dmTextPrice,
      dmImagePrice: updated.dmImagePrice,
      dmVideoPrice: updated.dmVideoPrice,
      audioCallPricePerMinute: updated.audioCallPricePerMinute,
      videoCallPricePerMinute: updated.videoCallPricePerMinute,
      liveStreamEntryPrice: updated.liveStreamEntryPrice,
    };
  }

  /**
   * Get price for specific message type
   */
  static async getDmPrice(
    creatorId: string,
    messageType: "text" | "image" | "video"
  ): Promise<number> {
    const pricing = await this.getOrCreatePricing(creatorId);

    switch (messageType) {
      case "text":
        return pricing.dmTextPrice;
      case "image":
        return pricing.dmImagePrice;
      case "video":
        return pricing.dmVideoPrice;
      default:
        return 0;
    }
  }

  /**
   * Get call price per minute
   */
  static async getCallPricePerMinute(
    creatorId: string,
    callType: "audio" | "video"
  ): Promise<number> {
    const pricing = await this.getOrCreatePricing(creatorId);

    return callType === "audio"
      ? pricing.audioCallPricePerMinute
      : pricing.videoCallPricePerMinute;
  }

  /**
   * Get live stream entry price
   */
  static async getLiveStreamEntryPrice(creatorId: string): Promise<number> {
    const pricing = await this.getOrCreatePricing(creatorId);
    return pricing.liveStreamEntryPrice;
  }
}
