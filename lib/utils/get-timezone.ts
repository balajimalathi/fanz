/**
 * Get the user's browser timezone
 * Falls back to UTC if timezone detection fails
 */
export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch (error) {
    console.warn("Failed to detect timezone, defaulting to UTC:", error)
    return "UTC"
  }
}

/**
 * Get headers with timezone for API requests
 */
export function getHeadersWithTimezone(
  additionalHeaders?: Record<string, string>
): HeadersInit {
  const timezone = getUserTimezone()
  return {
    "Content-Type": "application/json",
    "x-user-timezone": timezone,
    ...additionalHeaders,
  }
}
