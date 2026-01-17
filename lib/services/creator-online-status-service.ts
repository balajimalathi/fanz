import { db } from "@/lib/db/client";
import { creator } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export class CreatorOnlineStatusService {
  /**
   * Update creator's online status
   */
  static async updateOnlineStatus(
    creatorId: string,
    isOnline: boolean
  ): Promise<void> {
    await db
      .update(creator)
      .set({
        isOnline,
        lastSeenAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(creator.id, creatorId));
  }

  /**
   * Check if creator is currently online
   */
  static async isCreatorOnline(creatorId: string): Promise<boolean> {
    const creatorRecord = await db.query.creator.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, creatorId),
      columns: {
        isOnline: true,
        lastSeenAt: true,
      },
    });

    if (!creatorRecord) {
      return false;
    }

    // If marked as online, check if last seen is within last 2 minutes
    if (creatorRecord.isOnline && creatorRecord.lastSeenAt) {
      const lastSeen = new Date(creatorRecord.lastSeenAt);
      const now = new Date();
      const diffMinutes = (now.getTime() - lastSeen.getTime()) / (1000 * 60);

      // If last seen is more than 2 minutes ago, consider offline
      if (diffMinutes > 2) {
        // Auto-update to offline
        await this.updateOnlineStatus(creatorId, false);
        return false;
      }

      return true;
    }

    return false;
  }

  /**
   * Get creator's last seen timestamp
   */
  static async getLastSeenAt(creatorId: string): Promise<Date | null> {
    const creatorRecord = await db.query.creator.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, creatorId),
      columns: {
        lastSeenAt: true,
      },
    });

    return creatorRecord?.lastSeenAt ? new Date(creatorRecord.lastSeenAt) : null;
  }
}
