import { z } from "zod"

export const serviceSchema = z.object({
  name: z
    .string()
    .min(1, "Service name is required")
    .max(200, "Service name must be less than 200 characters"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(2000, "Description must be less than 2000 characters"),
  price: z
    .number()
    .min(0, "Price must be non-negative")
    .max(100000000, "Price is too large"), // Max 1 crore rupees
  serviceType: z.enum(["shoutout", "audio_call", "video_call"], {
    required_error: "Service type is required",
  }),
  visible: z.boolean().default(true),
})

export const createServiceSchema = serviceSchema

export const updateServiceSchema = serviceSchema.partial().extend({
  id: z.string().uuid("Invalid service ID"),
})

export type ServiceInput = z.infer<typeof serviceSchema>
export type CreateServiceInput = z.infer<typeof createServiceSchema>
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>

