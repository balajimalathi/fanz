import { z } from "zod"

// Service name and description: AaZz09 and ! . , @ only (space allowed)
const serviceTextRegex = /^[a-zA-Z0-9!.,@\s]*$/
const serviceDescriptionRegex = /^(?:[ a-zA-Z0-9.,_@#\r\n\-]|\p{Extended_Pictographic})*$/u;

export const SERVICE_NAME_MAX = 40
export const SERVICE_DESCRIPTION_MAX = 200
export const SERVICE_PRICE_MAX = 100000

export const serviceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Service name is required")
    .max(SERVICE_NAME_MAX, `Service name must be at most ${SERVICE_NAME_MAX} characters`)
    .refine((val) => serviceTextRegex.test(val), {
      message: "Only letters, numbers, and ! . , @ allowed",
    }),
  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(SERVICE_DESCRIPTION_MAX, `Description must be at most ${SERVICE_DESCRIPTION_MAX} characters`)
    .refine((val) => serviceDescriptionRegex.test(val), {
      message: "Only letters, numbers, and ! . , @ allowed",
    }),
  price: z
    .number()
    .min(0, "Price must be non-negative")
    .max(SERVICE_PRICE_MAX, `Price must be at most ${SERVICE_PRICE_MAX}`),
  serviceType: z.enum(["shoutout", "custom_video", "custom_photo", "product_review", "endorsement", "collaboration", "personalized_message"], {
    required_error: "Service type is required",
  }),
  visible: z.boolean().default(true),
})

export const createServiceSchema = serviceSchema

export const updateServiceSchema = serviceSchema.partial().extend({
  id: z.string().uuid("Invalid service ID"),
})

