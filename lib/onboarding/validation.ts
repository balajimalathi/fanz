import { db } from "@/lib/db/client";
import { creator } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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
 * Check if username is already taken
 */
export async function isUsernameTaken(
  username: string,
  excludeUserId?: string
): Promise<boolean> {
  const existingCreator = await db.query.creator.findFirst({
    where: (c, { eq: eqOp }) => eqOp(c.username, username.toLowerCase()),
  });

  if (!existingCreator) {
    return false;
  }

  // If we're checking for a specific user (e.g., during update), exclude their own username
  if (excludeUserId && existingCreator.id === excludeUserId) {
    return false;
  }

  return true;
}

/**
 * Validate username (format + uniqueness + reserved check)
 */
export async function validateUsername(
  username: string,
  excludeUserId?: string
): Promise<{
  valid: boolean;
  error?: string;
}> {
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

  // Uniqueness check
  const taken = await isUsernameTaken(username, excludeUserId);
  if (taken) {
    return {
      valid: false,
      error: "This username is already taken",
    };
  }

  return { valid: true };
}

/**
 * Generate subdomain from username
 * Sanitizes and ensures it's subdomain-safe
 */
export function generateSubdomain(username: string): string {
  // Convert to lowercase
  let subdomain = username.toLowerCase();

  // Remove any invalid characters (shouldn't happen if validated, but just in case)
  subdomain = subdomain.replace(/[^a-z0-9-]/g, "");

  // Ensure it doesn't start or end with a hyphen
  subdomain = subdomain.replace(/^-+|-+$/g, "");

  return subdomain;
}

/**
 * Check if subdomain is unique
 */
export async function isSubdomainTaken(
  subdomain: string,
  excludeUserId?: string
): Promise<boolean> {
  const existingCreator = await db.query.creator.findFirst({
    where: (c, { eq: eqOp }) => eqOp(c.subdomain, subdomain),
  });

  if (!existingCreator) {
    return false;
  }

  if (excludeUserId && existingCreator.id === excludeUserId) {
    return false;
  }

  return true;
}

/**
 * Generate unique subdomain from username
 * If the subdomain is taken, appends a number
 */
export async function generateUniqueSubdomain(
  username: string,
  excludeUserId?: string
): Promise<string> {
  let baseSubdomain = generateSubdomain(username);
  let subdomain = baseSubdomain;
  let counter = 1;

  while (await isSubdomainTaken(subdomain, excludeUserId)) {
    subdomain = `${baseSubdomain}${counter}`;
    counter++;
    
    // Safety check to prevent infinite loop
    if (counter > 1000) {
      throw new Error("Unable to generate unique subdomain");
    }
  }

  return subdomain;
}

