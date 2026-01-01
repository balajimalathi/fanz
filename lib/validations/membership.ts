import { z } from "zod"

// Valid monthly recurring fee options (in rupees)
const VALID_MONTHLY_FEES = [99, 199, 299, 499, 999, 1499, 1999, 2999, 4999] as const

export const membershipSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(2000, "Description must be less than 2000 characters"),
  monthlyRecurringFee: z
    .number()
    .min(0, "Monthly recurring fee must be non-negative")
    .refine(
      (fee) => (VALID_MONTHLY_FEES as readonly number[]).includes(fee),
      {
        message: `Monthly recurring fee must be one of: ${VALID_MONTHLY_FEES.join(", ")}`,
      }
    ),
  visible: z.boolean().default(true),
})

export const createMembershipSchema = membershipSchema

export const updateMembershipSchema = membershipSchema.partial().extend({
  id: z.string().uuid("Invalid membership ID"),
})

