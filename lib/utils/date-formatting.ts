import { format, formatDistanceToNow } from "date-fns"
import { formatInTimeZone, toZonedTime } from "date-fns-tz"

/**
 * Get the user's browser timezone
 * Falls back to UTC if timezone detection fails
 */
function getUserTimezone(): string {
  if (typeof window === "undefined") {
    // Server-side: default to UTC
    return "UTC"
  }
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch (error) {
    console.warn("Failed to detect timezone, defaulting to UTC:", error)
    return "UTC"
  }
}

/**
 * Convert a date string or Date object to a Date object
 * Assumes UTC if the string doesn't include timezone info
 */
function parseDate(date: Date | string): Date {
  if (date instanceof Date) {
    return date
  }
  // If it's already an ISO string with timezone, parse it directly
  if (date.includes("Z") || date.includes("+") || date.includes("-", 10)) {
    return new Date(date)
  }
  // If no timezone info, assume UTC
  return new Date(date + (date.includes("T") ? "Z" : "T00:00:00Z"))
}

/**
 * Format a date in the user's local timezone
 * @param date - Date object or ISO string (assumed to be UTC)
 * @param options - Intl.DateTimeFormatOptions for customization
 * @returns Formatted date string in user's local timezone
 */
export function formatDateLocal(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = parseDate(date)
  const timezone = getUserTimezone()
  
  // Use date-fns-tz to format in the user's timezone
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...options,
  }
  
  return formatInTimeZone(dateObj, timezone, "MMM d, yyyy", {
    locale: undefined, // Use default locale
  })
}

/**
 * Format a date and time in the user's local timezone
 * @param date - Date object or ISO string (assumed to be UTC)
 * @param options - Intl.DateTimeFormatOptions for customization
 * @returns Formatted date and time string in user's local timezone
 */
export function formatDateTimeLocal(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = parseDate(date)
  const timezone = getUserTimezone()
  
  // Use date-fns-tz to format in the user's timezone
  const formatString = "MMM d, yyyy, h:mm a"
  
  return formatInTimeZone(dateObj, timezone, formatString, {
    locale: undefined, // Use default locale
  })
}

/**
 * Format a date as relative time (e.g., "2 hours ago") using local timezone
 * @param date - Date object or ISO string (assumed to be UTC)
 * @returns Relative time string
 */
export function formatRelativeTime(date: Date | string): string {
  const dateObj = parseDate(date)
  const timezone = getUserTimezone()
  
  // Convert UTC date to user's timezone for accurate relative time calculation
  const zonedDate = toZonedTime(dateObj, timezone)
  const now = new Date()
  const zonedNow = toZonedTime(now, timezone)
  
  return formatDistanceToNow(zonedDate, { addSuffix: true })
}

/**
 * Format a date as a short date string in local timezone
 * @param date - Date object or ISO string (assumed to be UTC)
 * @returns Short date string (e.g., "Jan 15, 2024")
 */
export function formatDateShort(date: Date | string): string {
  const dateObj = parseDate(date)
  const timezone = getUserTimezone()
  
  return formatInTimeZone(dateObj, timezone, "MMM d, yyyy")
}

/**
 * Format a date as a time string in local timezone
 * @param date - Date object or ISO string (assumed to be UTC)
 * @returns Time string (e.g., "4:30 PM")
 */
export function formatTimeLocal(date: Date | string): string {
  const dateObj = parseDate(date)
  const timezone = getUserTimezone()
  
  return formatInTimeZone(dateObj, timezone, "h:mm a")
}

/**
 * Ensure a date is in ISO format (UTC) for API responses
 * @param date - Date object or ISO string
 * @returns ISO string in UTC format
 */
export function formatDateISO(date: Date | string): string {
  const dateObj = parseDate(date)
  return dateObj.toISOString()
}

/**
 * Format a date using date-fns format string in local timezone
 * @param date - Date object or ISO string (assumed to be UTC)
 * @param formatStr - date-fns format string
 * @returns Formatted date string
 */
export function formatDateCustom(date: Date | string, formatStr: string): string {
  const dateObj = parseDate(date)
  const timezone = getUserTimezone()
  
  return formatInTimeZone(dateObj, timezone, formatStr)
}
