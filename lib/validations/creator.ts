import { z } from "zod";
import { isReservedSubdomain } from "@/lib/onboarding/validation-client";
import { ONBOARDING_CURRENCIES } from "@/lib/currency/currency-config";

// Regex for alphanumeric, hyphens, and underscores
const usernameRegex = /^[a-zA-Z0-9_-]+$/;

// Regex for social media handles (alphanumeric, dots, hyphens, underscores)
// Handles can start with @ or without it
const socialMediaHandleRegex = /^@?[a-zA-Z0-9._-]+$/;

// Helper function to normalize social media handles (remove @ if present)
export function normalizeSocialMediaHandle(handle: string): string {
  if (!handle) return ""
  // Remove @ if present and trim whitespace
  return handle.trim().replace(/^@+/, "")
}

// Helper function to validate social media handle
export function validateSocialMediaHandle(handle: string): { valid: boolean; error?: string } {
  if (!handle || handle.trim() === "") {
    return { valid: true } // Empty is allowed
  }
  
  const normalized = normalizeSocialMediaHandle(handle)
  
  if (normalized.length === 0) {
    return { valid: false, error: "Handle cannot be empty" }
  }
  
  if (!socialMediaHandleRegex.test(handle)) {
    return { valid: false, error: "Handle can only contain letters, numbers, dots, hyphens, and underscores" }
  }
  
  if (normalized.length > 50) {
    return { valid: false, error: "Handle must be less than 50 characters" }
  }
  
  return { valid: true }
}

export const updateCreatorProfileSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(
      usernameRegex,
      "Username can only contain letters, numbers, hyphens, and underscores"
    )
    .refine((val) => !isReservedSubdomain(val), {
      message: "This username is reserved and cannot be used",
    })
    .optional(),
  displayName: z
    .string()
    .min(1, "Display name is required")
    .max(100, "Display name must be less than 100 characters")
    .optional(),
  bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
  socialMediaLinks: z.object({
    instagram: z.string().max(50, "Handle must be less than 50 characters").optional().or(z.literal("")),
    twitter: z.string().max(50, "Handle must be less than 50 characters").optional().or(z.literal("")),
    facebook: z.string().max(50, "Handle must be less than 50 characters").optional().or(z.literal("")),
    telegram: z.string().max(50, "Handle must be less than 50 characters").optional().or(z.literal("")),
    tiktok: z.string().max(50, "Handle must be less than 50 characters").optional().or(z.literal("")),
    snapchat: z.string().max(50, "Handle must be less than 50 characters").optional().or(z.literal("")),
    youtube: z.string().max(50, "Handle must be less than 50 characters").optional().or(z.literal("")),
    linkedin: z.string().max(50, "Handle must be less than 50 characters").optional().or(z.literal("")),
  }).optional(),
  profileHidden: z.boolean().optional(),
});

export type UpdateCreatorProfileInput = z.infer<typeof updateCreatorProfileSchema>;

export const bankDetailsSchema = z.object({
  pan: z.string().min(1, "PAN is required"),
  accountNumber: z.string().min(1, "Account number is required"),
  ifscCode: z.string().min(1, "IFSC Code is required"),
  bankName: z.string().min(1, "Bank name is required"),
  accountHolderName: z.string().min(1, "Account holder name is required"),
  branchName: z.string().optional(),
  accountType: z.enum(["savings", "current"]).optional(),
});

export type BankDetailsInput = z.infer<typeof bankDetailsSchema>;

export const payoutSettingsSchema = z.object({
  minimumThreshold: z
    .number()
    .min(0, "Minimum threshold must be positive")
    .optional(),
  automaticPayout: z.boolean().optional(),
});

export type PayoutSettingsInput = z.infer<typeof payoutSettingsSchema>;

/**
 * Currency validation schema
 * Uses ONBOARDING_CURRENCIES from config - expand as payment gateways support more
 */
export const currencySchema = z
  .string()
  .length(3, "Currency code must be 3 characters")
  .regex(/^[A-Z]{3}$/, "Currency code must be uppercase letters only")
  .refine(
    (val) => ONBOARDING_CURRENCIES.includes(val as (typeof ONBOARDING_CURRENCIES)[number]),
    {
      message: `Currency must be one of: ${ONBOARDING_CURRENCIES.join(", ")}`,
    }
  );

export const creatorCurrencySchema = z.object({
  currency: currencySchema.optional(),
});

export type CreatorCurrencyInput = z.infer<typeof creatorCurrencySchema>;
