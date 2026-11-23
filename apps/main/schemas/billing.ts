import { z } from "zod"
import { ADD_CREDITS_MAX, ADD_CREDITS_MIN } from "@/lib/boli"

/** Add credits: how many (1 credit = Rs 1) and which gateway. The price is worked out on the server, never sent. */
export const addCreditsSchema = z.object({
    credits: z
        .number()
        .int("Whole credits only.")
        .min(ADD_CREDITS_MIN, `At least ${ADD_CREDITS_MIN.toLocaleString("en-US")} credits.`)
        .max(ADD_CREDITS_MAX, `At most ${ADD_CREDITS_MAX.toLocaleString("en-US")} credits at a time.`),
    provider: z.enum(["esewa", "khalti"]),
})
export type AddCreditsInput = z.infer<typeof addCreditsSchema>
