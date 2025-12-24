/**
 * Client-side validation functions (no database dependencies)
 */

/**
 * Reserved subdomains that cannot be used
 */
export const RESERVED_SUBDOMAINS = [
  "www",
  "api",
  "app",
  "admin",
  "mail",
  "ftp",
  "blog",
  "docs",
  "help",
  "support",
  "status",
  "cdn",
  "static",
  "assets",
  "images",
  "media",
] as const;

/**
 * Validate username format
 * Rules: 3-30 characters, alphanumeric + hyphens/underscores only
 */
export function validateUsernameFormat(username: string): {
  valid: boolean;
  error?: string;
} {
  if (!username) {
    return { valid: false, error: "Username is required" };
  }

  if (username.length < 3) {
    return { valid: false, error: "Username must be at least 3 characters" };
  }

  if (username.length > 30) {
    return { valid: false, error: "Username must be at most 30 characters" };
  }

  // Only alphanumeric, hyphens, and underscores
  const usernameRegex = /^[a-zA-Z0-9_-]+$/;
  if (!usernameRegex.test(username)) {
    return {
      valid: false,
      error: "Username can only contain letters, numbers, hyphens, and underscores",
    };
  }

  return { valid: true };
}

/**
 * Check if username is reserved
 */
export function isReservedSubdomain(username: string): boolean {
  return RESERVED_SUBDOMAINS.includes(username.toLowerCase() as typeof RESERVED_SUBDOMAINS[number]);
}

/**
 * Validate username format and reserved check (client-side only)
 */
export function validateUsernameClient(username: string): {
  valid: boolean;
  error?: string;
} {
  // Format validation
  const formatCheck = validateUsernameFormat(username);
  if (!formatCheck.valid) {
    return formatCheck;
  }

  // Reserved subdomain check
  if (isReservedSubdomain(username)) {
    return {
      valid: false,
      error: "This username is reserved and cannot be used",
    };
  }

  return { valid: true };
}

