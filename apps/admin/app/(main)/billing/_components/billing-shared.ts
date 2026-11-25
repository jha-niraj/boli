import { formatCredits, PLANS, type PlanCode } from "@repo/billing/plans"

/** Query keys and labels shared by the billing page and its sheets. */
export const BILLING_KEYS = {
    all: ["billing"] as const,
    stats: ["billing", "stats"] as const,
    overview: ["billing", "overview"] as const,
    payments: (page: number, provider: string, status: string, search: string) => ["billing", "payments", page, provider, status, search] as const,
    subscriptions: (page: number) => ["billing", "subscriptions", page] as const,
    credits: (userId: string) => ["billing", "credits", userId] as const,
    grants: (page: number) => ["billing", "grants", page] as const,
}

/** Payment statuses an admin can filter by (Money > Payments, `?status=`). */
export const PAYMENT_FILTER_STATUSES = ["succeeded", "pending", "failed", "cancelled", "refunded"] as const

export const PROVIDER_NAMES: Record<string, string> = { esewa: "eSewa", khalti: "Khalti", razorpay: "Razorpay", cashfree: "Cashfree", stripe: "Stripe" }
export const STATUS_LABELS: Record<string, string> = { pending: "Waiting", succeeded: "Paid", failed: "Failed", cancelled: "Cancelled", refunded: "Refunded", created: "Started" }

export function paymentWhat(p: { kind: string; credits: number | null; termMonths: number | null; autoRenew: boolean; planCode: string | null }): string {
    if (p.kind === "credits") return `${formatCredits(p.credits ?? 0)} credits`
    const plan = PLANS[(p.planCode as PlanCode) ?? "pro"]?.name ?? "Plan"
    if (p.kind === "renewal") return `${plan}, renewal`
    return p.autoRenew ? `${plan}, monthly auto-renew` : `${plan}, ${p.termMonths ?? 1} mo`
}

