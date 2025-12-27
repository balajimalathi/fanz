import { z } from "zod"

// Base schema without refinement (for partial operations)
const baseServiceSchema = z.object({
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
  serviceType: z.enum(["shoutout", "audio_call", "video_call", "chat"], {
    required_error: "Service type is required",
  }),
  duration: z
    .number()
    .int("Duration must be a whole number")
    .min(1, "Duration must be at least 1 minute")
    .max(1440, "Duration cannot exceed 1440 minutes (24 hours)")
    .optional(),
  visible: z.boolean().default(true),
})

// Full schema with refinement for create operations
export const serviceSchema = baseServiceSchema.refine((data) => {
  // Duration is required for chat, audio_call, and video_call
  if (["chat", "audio_call", "video_call"].includes(data.serviceType)) {
    return data.duration !== undefined && data.duration > 0
  }
  return true
}, {
  message: "Duration is required for chat, audio call, and video call services",
  path: ["duration"],
})

export const createServiceSchema = serviceSchema

// Update schema: make base schema partial, then extend with id
export const updateServiceSchema = baseServiceSchema.partial().extend({
  id: z.string().uuid("Invalid service ID"),
})

export type ServiceInput = z.infer<typeof serviceSchema>
export type CreateServiceInput = z.infer<typeof createServiceSchema>
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>

