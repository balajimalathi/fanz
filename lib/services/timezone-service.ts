import { fromZonedTime, toZonedTime, format } from "date-fns-tz";
import { parse, getDay, addDays, startOfDay, isWithinInterval } from "date-fns";

export type DayOfWeek =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

export type AvailabilitySchedule = {
  enabled: boolean;
  timezone: string;
  schedule: {
    [day: string]: {
      enabled: boolean;
      startTime: string; // "HH:mm" format in creator's timezone
      endTime: string; // "HH:mm" format in creator's timezone
    };
  };
};

/**
 * Convert a local time string (HH:mm) to UTC Date for a specific day and timezone
 */
export function convertToUTC(
  dayOfWeek: DayOfWeek,
  timeString: string,
  timezone: string
): Date {
  // Map day names to day numbers (0 = Sunday, 1 = Monday, etc.)
  const dayMap: Record<DayOfWeek, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  // Get current date in the target timezone
  const now = new Date();
  const zonedNow = toZonedTime(now, timezone);

  // Find the next occurrence of the specified day
  const targetDay = dayMap[dayOfWeek];
  let daysToAdd = targetDay - zonedNow.getDay();
  if (daysToAdd < 0) {
    daysToAdd += 7; // If the day has passed this week, get next week's occurrence
  }

  // Create date for the target day
  const targetDate = addDays(zonedNow, daysToAdd);
  const dateString = format(targetDate, "yyyy-MM-dd", { timeZone: timezone });

  // Parse the time string and create a datetime string in the timezone
  const [hours, minutes] = timeString.split(":").map(Number);
  const datetimeString = `${dateString}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;

  // Convert to UTC
  return fromZonedTime(datetimeString, timezone);
}

/**
 * Convert UTC time to a specific timezone
 */
export function convertFromUTC(utcTime: Date, targetTimezone: string): Date {
  return toZonedTime(utcTime, targetTimezone);
}

/**
 * Get current day of week in a specific timezone
 */
export function getCurrentDayOfWeek(timezone: string): DayOfWeek {
  const now = new Date();
  const zonedNow = toZonedTime(now, timezone);
  const dayNumber = zonedNow.getDay();

  const dayMap: Record<number, DayOfWeek> = {
    0: "sunday",
    1: "monday",
    2: "tuesday",
    3: "wednesday",
    4: "thursday",
    5: "friday",
    6: "saturday",
  };

  return dayMap[dayNumber];
}

/**
 * Check if current time (in fan's timezone) falls within creator's availability window
 * This converts the creator's schedule to the fan's timezone for comparison
 */
export function isWithinAvailabilityWindow(
  utcNow: Date,
  schedule: AvailabilitySchedule,
  fanTimezone: string
): boolean {
  if (!schedule.enabled) {
    return false; // Availability scheduling is disabled
  }

  // Get current day and time in fan's timezone
  const fanNow = convertFromUTC(utcNow, fanTimezone);
  const currentDay = getCurrentDayOfWeek(fanTimezone);
  const currentTime = format(fanNow, "HH:mm");

  // Get schedule for current day
  const daySchedule = schedule.schedule[currentDay];
  if (!daySchedule || !daySchedule.enabled) {
    return false; // Day is not enabled or doesn't exist
  }

  // Parse start and end times
  const [startHours, startMinutes] = daySchedule.startTime
    .split(":")
    .map(Number);
  const [endHours, endMinutes] = daySchedule.endTime.split(":").map(Number);

  // Create time objects for comparison (using today's date in fan's timezone)
  const dayStart = startOfDay(fanNow);
  const startTime = new Date(dayStart);
  startTime.setHours(startHours, startMinutes, 0, 0);

  const endTime = new Date(dayStart);
  endTime.setHours(endHours, endMinutes, 0, 0);

  // Handle case where end time is next day (e.g., 11 PM - 2 AM)
  if (endTime <= startTime) {
    endTime.setDate(endTime.getDate() + 1);
  }

  // Check if current time is within the interval
  return isWithinInterval(fanNow, { start: startTime, end: endTime });
}

/**
 * Get next available time slot for a creator
 */
export function getNextAvailableTime(
  schedule: AvailabilitySchedule,
  fanTimezone: string
): Date | null {
  if (!schedule.enabled) {
    return null;
  }

  const now = new Date();
  const fanNow = convertFromUTC(now, fanTimezone);
  const currentDay = getCurrentDayOfWeek(fanTimezone);

  const dayMap: DayOfWeek[] = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];

  // Check next 7 days
  for (let i = 0; i < 7; i++) {
    const checkDayIndex = (dayMap.indexOf(currentDay) + i) % 7;
    const checkDay = dayMap[checkDayIndex];
    const daySchedule = schedule.schedule[checkDay];

    if (daySchedule && daySchedule.enabled) {
      const [hours, minutes] = daySchedule.startTime.split(":").map(Number);
      const dayStart = startOfDay(fanNow);
      const nextTime = new Date(dayStart);
      nextTime.setDate(nextTime.getDate() + i);
      nextTime.setHours(hours, minutes, 0, 0);

      // If it's today and the time has passed, skip to next occurrence
      if (i === 0 && nextTime <= fanNow) {
        continue;
      }

      // Convert back to UTC
      return fromZonedTime(nextTime, fanTimezone);
    }
  }

  return null;
}

/**
 * Format schedule for display in a specific timezone
 */
export function formatScheduleForDisplay(
  schedule: AvailabilitySchedule,
  displayTimezone: string
): string {
  if (!schedule.enabled) {
    return "Availability scheduling is disabled";
  }

  const dayNames: Record<string, string> = {
    monday: "Mon",
    tuesday: "Tue",
    wednesday: "Wed",
    thursday: "Thu",
    friday: "Fri",
    saturday: "Sat",
    sunday: "Sun",
  };

  const enabledDays = Object.entries(schedule.schedule)
    .filter(([_, daySchedule]) => daySchedule.enabled)
    .map(([day, daySchedule]) => {
      const dayName = dayNames[day] || day;
      return `${dayName}: ${daySchedule.startTime} - ${daySchedule.endTime}`;
    });

  if (enabledDays.length === 0) {
    return "No availability set";
  }

  return enabledDays.join(", ");
}
