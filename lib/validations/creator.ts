import { z } from "zod";
import { isReservedSubdomain, validateUsernameFormat } from "@/lib/onboarding/validation-client";
import { ONBOARDING_CURRENCIES } from "@/lib/currency/currency-config";

// Regex for alphanumeric, hyphens, and underscores
const usernameRegex = /^[a-zA-Z0-9_-]+$/;

// Regex for social media handles (alphanumeric, dots, hyphens, underscores)
// Handles can start with @ or without it
const socialMediaHandleRegex = /^@?[a-zA-Z0-9._-]+$/;

// Profile display name and bio: only A-Za-z0-9_- and emojis (Extended_Pictographic)
const profileTextRegex = /^(?:[ a-zA-Z0-9.,_@#-]|\p{Extended_Pictographic})*$/u;
const bioTextRegex = /^(?:[ a-zA-Z0-9.,_@#\r\n\-]|\p{Extended_Pictographic})*$/u;

export const PROFILE_DISPLAY_NAME_MAX = 30;
export const PROFILE_BIO_MAX = 100;

export function validateProfileDisplayName(
  value: string
): { valid: boolean; error?: string } {
  const trimmed = value.trim();
  if (!trimmed.length) {
    return { valid: false, error: "Display name is required" };
  }
  if (trimmed.length > PROFILE_DISPLAY_NAME_MAX) {
    return {
      valid: false,
      error: `Display name must be at most ${PROFILE_DISPLAY_NAME_MAX} characters`,
    };
  }
  if (!profileTextRegex.test(trimmed)) {
    return {
      valid: false,
      error: "Only letters, numbers, hyphens, underscores and emojis allowed",
    };
  }
  return { valid: true };
}

export function validateProfileBio(value: string): { valid: boolean; error?: string } {
  const trimmed = value.trim();
  if (trimmed.length > PROFILE_BIO_MAX) {
    return {
      valid: false,
      error: `Bio must be at most ${PROFILE_BIO_MAX} characters`,
    };
  }
  if (trimmed.length > 0 && !bioTextRegex.test(value)) {
    return {
      valid: false,
      error: "Only letters, numbers, hyphens, underscores, newlines and emojis allowed",
    };
  }
  return { valid: true };
}

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
    .trim()
    .min(1, "Display name is required")
    .max(PROFILE_DISPLAY_NAME_MAX, `Display name must be at most ${PROFILE_DISPLAY_NAME_MAX} characters`)
    .refine((val) => profileTextRegex.test(val), {
      message: "Only letters, numbers, hyphens, underscores and emojis allowed",
    })
    .optional(),
  bio: z
    .string()
    .trim()
    .max(PROFILE_BIO_MAX, `Bio must be at most ${PROFILE_BIO_MAX} characters`)
    .refine((val) => val === "" || bioTextRegex.test(val), {
      message: "Only letters, numbers, hyphens, underscores, newlines and emojis allowed",
    })
    .optional(),
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

/**
 * Schema for the profile edit form (react-hook-form + zodResolver).
 * Same rules as updateCreatorProfileSchema for username, displayName, bio.
 */
export const profileFormSchema = z.object({
  username: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.trim().length === 0 || validateUsernameFormat(val.trim()).valid,
      (val) => ({
        message: (val && validateUsernameFormat((val ?? "").trim()).error) ?? "Invalid username",
      })
    )
    .refine((val) => !val || val.trim().length === 0 || !isReservedSubdomain((val ?? "").trim()), {
      message: "This username is reserved and cannot be used",
    }),
  displayName: z
    .string()
    .trim()
    .min(1, "Display name is required")
    .max(PROFILE_DISPLAY_NAME_MAX, `Display name must be at most ${PROFILE_DISPLAY_NAME_MAX} characters`)
    .refine((val) => profileTextRegex.test(val), {
      message: "Only letters, numbers, hyphens, underscores and emojis allowed",
    }),
  bio: z
    .string()
    .trim()
    .max(PROFILE_BIO_MAX, `Bio must be at most ${PROFILE_BIO_MAX} characters`)
    .refine((val) => val === "" || bioTextRegex.test(val), {
      message: "Only letters, numbers, hyphens, underscores, newlines and emojis allowed",
    })
    .optional()
    .transform((val) => val ?? ""),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;

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
