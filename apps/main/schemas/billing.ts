import { z } from "zod"
import { ADD_CREDITS_MAX, ADD_CREDITS_MIN, CREDIT_PACKS, type CreditPackId } from "@repo/boli"

const provider = z.enum(["esewa", "khalti"])

/** Add credits: how many (1 credit = Rs 1) and which gateway. The price is worked out on the server, never sent. */
export const addCreditsSchema = z.object({
    credits: z
        .number()
        .int("Whole credits only.")
        .min(ADD_CREDITS_MIN, `At least ${ADD_CREDITS_MIN.toLocaleString("en-US")} credits.`)
        .max(ADD_CREDITS_MAX, `At most ${ADD_CREDITS_MAX.toLocaleString("en-US")} credits at a time.`),
    provider,
})
export type AddCreditsInput = z.infer<typeof addCreditsSchema>

const PACK_IDS = CREDIT_PACKS.map((p) => p.id) as [CreditPackId, ...CreditPackId[]]

/** Buy a pack: only its id and the gateway. What it costs and what it grants come from the server's pack table. */
export const buyPackSchema = z.object({
    pack: z.enum(PACK_IDS, { message: "Choose a credit pack." }),
    provider,
})
export type BuyPackInput = z.infer<typeof buyPackSchema>
