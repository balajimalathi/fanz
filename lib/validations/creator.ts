import { z } from "zod";
import { isReservedSubdomain } from "@/lib/onboarding/validation-client";
import { SUPPORTED_CURRENCIES } from "@/lib/currency/currency-config";

// Regex for alphanumeric, hyphens, and underscores
const usernameRegex = /^[a-zA-Z0-9_-]+$/;

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
 * Validates ISO 4217 currency codes
 */
export const currencySchema = z
  .string()
  .length(3, "Currency code must be 3 characters")
  .regex(/^[A-Z]{3}$/, "Currency code must be uppercase letters only")
  .refine(
    (val) => SUPPORTED_CURRENCIES.includes(val as any),
    {
      message: `Currency must be one of: ${SUPPORTED_CURRENCIES.join(", ")}`,
    }
  );

export const creatorCurrencySchema = z.object({
  currency: currencySchema.optional(),
});

export type CreatorCurrencyInput = z.infer<typeof creatorCurrencySchema>;
