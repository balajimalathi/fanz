import { formatRelativeTime } from "./date-formatting"

/**
 * Format a date to relative time (e.g., "2 hours ago", "3 days ago")
 * Uses timezone-aware formatting
 */
export function formatPostDate(date: string | Date): string {
  return formatRelativeTime(date)
}

/**
 * Check if a post should be shown to the user
 * This is a client-side helper - actual access control is done server-side
 */
export function shouldShowPost(
  postType: "subscription" | "exclusive" | "free",
  hasAccess: boolean
): boolean {
  if (postType === "subscription") {
    return hasAccess
  }
  // Free and exclusive posts are always shown (with blurred preview if not purchased/not logged in)
  return true
}

