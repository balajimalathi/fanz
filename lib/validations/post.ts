import { z } from "zod"

export const createPostSchema = z
  .object({
    caption: z.string().max(5000, "Caption must be less than 5000 characters").optional(),
    postType: z.enum(["subscription", "exclusive"]),
    price: z.number().min(0, "Price must be non-negative").optional(),
    membershipIds: z.array(z.string().uuid("Invalid membership ID")).optional(),
  })
  .refine(
    (data) => {
      if (data.postType === "subscription") {
        return data.membershipIds && data.membershipIds.length > 0
      }
      if (data.postType === "exclusive") {
        return data.price !== undefined && data.price > 0
      }
      return true
    },
    {
      message: "Subscription posts require at least one membership. Exclusive posts require a price > 0.",
      path: ["postType"],
    }
  )

export const uploadMediaSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.type.startsWith("image/"), {
      message: "File must be an image",
    })
    .refine((file) => file.size <= 10 * 1024 * 1024, {
      message: "File size must be less than 10MB",
    }),
})
