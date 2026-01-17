import { db } from "@/lib/db/client";
import { creator } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  isWithinAvailabilityWindow,
  getNextAvailableTime,
  formatScheduleForDisplay,
  type AvailabilitySchedule,
} from "./timezone-service";

export class AvailabilityService {
  /**
   * Check if creator is available for calls at the current time
   * @param creatorId - Creator's user ID
   * @param fanTimezone - Fan's timezone (e.g., "America/New_York")
   * @returns Object with availability status and next available time if unavailable
   */
  static async isCreatorAvailableForCalls(
    creatorId: string,
    fanTimezone: string
  ): Promise<{
    available: boolean;
    nextAvailableTime?: Date;
    schedule?: string;
    error?: string;
  }> {
    try {
      const creatorRecord = await db.query.creator.findFirst({
        where: (c, { eq: eqOp }) => eqOp(c.id, creatorId),
        columns: {
          callEnabled: true,
          callAvailabilitySchedule: true,
        },
      });

      if (!creatorRecord) {
        return {
          available: false,
          error: "Creator not found",
        };
      }

      // If call feature is disabled, not available
      if (!creatorRecord.callEnabled) {
        return {
          available: false,
          error: "Calls are disabled for this creator",
        };
      }

      // If no schedule is set, availability is enabled (backward compatibility)
      if (!creatorRecord.callAvailabilitySchedule) {
        return {
          available: true,
        };
      }

      const schedule = creatorRecord.callAvailabilitySchedule as AvailabilitySchedule;

      // If schedule is disabled, availability is enabled (backward compatibility)
      if (!schedule.enabled) {
        return {
          available: true,
        };
      }

      // Check if current time is within availability window
      const now = new Date();
      const isAvailable = isWithinAvailabilityWindow(now, schedule, fanTimezone);

      if (isAvailable) {
        return {
          available: true,
        };
      }

      // Get next available time
      const nextAvailable = getNextAvailableTime(schedule, fanTimezone);
      const scheduleDisplay = formatScheduleForDisplay(schedule, fanTimezone);

      return {
        available: false,
        nextAvailableTime: nextAvailable || undefined,
        schedule: scheduleDisplay,
      };
    } catch (error) {
      console.error("Error checking call availability:", error);
      return {
        available: false,
        error: "Error checking availability",
      };
    }
  }

  /**
   * Check if creator is available for chats at the current time
   * @param creatorId - Creator's user ID
   * @param fanTimezone - Fan's timezone (e.g., "America/New_York")
   * @returns Object with availability status and next available time if unavailable
   */
  static async isCreatorAvailableForChats(
    creatorId: string,
    fanTimezone: string
  ): Promise<{
    available: boolean;
    nextAvailableTime?: Date;
    schedule?: string;
    error?: string;
  }> {
    try {
      const creatorRecord = await db.query.creator.findFirst({
        where: (c, { eq: eqOp }) => eqOp(c.id, creatorId),
        columns: {
          chatEnabled: true,
          chatAvailabilitySchedule: true,
        },
      });

      if (!creatorRecord) {
        return {
          available: false,
          error: "Creator not found",
        };
      }

      // If chat feature is disabled, not available
      if (!creatorRecord.chatEnabled) {
        return {
          available: false,
          error: "Chat is disabled for this creator",
        };
      }

      // If no schedule is set, availability is enabled (backward compatibility)
      if (!creatorRecord.chatAvailabilitySchedule) {
        return {
          available: true,
        };
      }

      const schedule = creatorRecord.chatAvailabilitySchedule as AvailabilitySchedule;

      // If schedule is disabled, availability is enabled (backward compatibility)
      if (!schedule.enabled) {
        return {
          available: true,
        };
      }

      // Check if current time is within availability window
      const now = new Date();
      const isAvailable = isWithinAvailabilityWindow(now, schedule, fanTimezone);

      if (isAvailable) {
        return {
          available: true,
        };
      }

      // Get next available time
      const nextAvailable = getNextAvailableTime(schedule, fanTimezone);
      const scheduleDisplay = formatScheduleForDisplay(schedule, fanTimezone);

      return {
        available: false,
        nextAvailableTime: nextAvailable || undefined,
        schedule: scheduleDisplay,
      };
    } catch (error) {
      console.error("Error checking chat availability:", error);
      return {
        available: false,
        error: "Error checking availability",
      };
    }
  }
}
