import { z } from "zod"

export const fulfillOrderSchema = z.object({
  notes: z.string().optional(),
})

export const updateOrderStatusSchema = z.object({
  status: z.enum(["pending", "active", "fulfilled", "cancelled"], {
    required_error: "Status is required",
  }),
  fulfillmentNotes: z.string().optional(),
})

export const activateOrderSchema = z.object({
  // No additional fields needed for activation
})
