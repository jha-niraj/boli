import { z } from "zod"

/** The header's Feedback popover. */
export const feedbackSchema = z.object({
    message: z.string().trim().min(1, "Write a few words first.").max(4000, "Keep it under 4,000 characters."),
    rating: z.number().int().min(1).max(5).nullable().optional(),
    /** The route it was sent from, without a query string. */
    page: z.string().trim().max(300).nullable().optional(),
})
export type FeedbackInput = z.infer<typeof feedbackSchema>
