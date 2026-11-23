import { z } from "zod"

/** Create an API key: just a name to recognise it by later. */
export const createKeySchema = z.object({
    name: z.string().trim().min(1, "Give the key a name.").max(60, "Keep the name under 60 characters."),
})
export type CreateKeyInput = z.infer<typeof createKeySchema>

export const keyIdSchema = z.string().trim().min(1).max(100)
