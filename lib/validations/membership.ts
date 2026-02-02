import { z } from "zod"

// Title and description: AaZz09 and ! . , @ only (space allowed)
const membershipTextRegex = /^[a-zA-Z0-9!.,@\s]*$/

export const MEMBERSHIP_TITLE_MAX = 40
export const MEMBERSHIP_DESCRIPTION_MAX = 200
export const MEMBERSHIP_PRICE_MAX = 100000

export const membershipSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(MEMBERSHIP_TITLE_MAX, `Title must be at most ${MEMBERSHIP_TITLE_MAX} characters`)
    .refine((val) => membershipTextRegex.test(val), {
      message: "Only letters, numbers, and ! . , @ allowed",
    }),
  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(MEMBERSHIP_DESCRIPTION_MAX, `Description must be at most ${MEMBERSHIP_DESCRIPTION_MAX} characters`)
    .refine((val) => membershipTextRegex.test(val), {
      message: "Only letters, numbers, and ! . , @ allowed",
    }),
  monthlyRecurringFee: z
    .number()
    .min(0, "Monthly recurring fee must be non-negative")
    .max(MEMBERSHIP_PRICE_MAX, `Monthly recurring fee must be at most ${MEMBERSHIP_PRICE_MAX}`),
  visible: z.boolean().default(true),
})

export const createMembershipSchema = membershipSchema

export const updateMembershipSchema = membershipSchema.partial().extend({
  id: z.string().uuid("Invalid membership ID"),
})

