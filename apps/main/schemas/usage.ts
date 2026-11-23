import { z } from "zod"

/** The /usage page's filters (window, source) and the request log page. */
export const usageQuerySchema = z.object({
    window: z.enum(["7d", "30d", "90d"]).default("30d"),
    source: z.enum(["all", "kura", "api"]).default("all"),
    page: z.coerce.number().int().min(1).max(10_000).default(1),
})
export type UsageQueryInput = z.input<typeof usageQuerySchema>
