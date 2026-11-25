"use server"

/**
 * Admin billing: the credits overview (Money > Billing), payments, a recheck with the gateway, and manual credit
 * grants. Boli is credits only: getBillingStats / getBillingSubscriptions are the template's plan reads, kept but no
 * longer shown anywhere in the console. Every export checks the
 * admin session and permission itself (requireAdminAction) and returns ActionResult.
 *
 * Permissions: there is no `billing` module in the admin catalogue yet, so reading uses `analytics` (it already covers
 * financial reports) and granting credits needs `users` write. Add a `billing` module to lib/permissions.ts and swap
 * these two constants when the team wants it separate.
 */
import { revalidatePath } from "next/cache"
import { and, count, db, desc, eq, sql } from "@repo/db"
import { adminAuditLog, billingAccount, creditLedger, user, workspace } from "@repo/db/schema"
import {
    adminBillingStats, adminGrantCredits, adminListPayments, adminListSubscriptions, adminUserCredits, confirmPayment, getPayment, isProviderId,
    type AdminBillingStats, type AdminLedgerRow, type AdminPaymentFilters, type AdminPaymentRow, type AdminSubscriptionRow, type ConfirmOutcome, type Paged,
} from "@repo/billing"
import { fail, failWith, ok, type ActionResult } from "@repo/errors"
import { loadBillingOverview, type BillingOverview } from "@/lib/money-data"
import { requireAdminAction } from "./guard"

const READ = "analytics" as const
const GRANT = "users" as const
const GRANTS_PER_PAGE = 25

/** One manual credit grant (or take-back) from the ledger, for Money > Credits. */
export interface CreditGrantRow {
    id: string
    /** Signed micro-credits. */
    amountMicro: number
    reason: string | null
    /** Who received it: the person, or the workspace for a workspace-owned account. */
    ownerType: string
    ownerName: string | null
    ownerEmail: string | null
    /** The admin who granted it (null for an automatic grant, such as welcome credits). */
    grantedByName: string | null
    createdAt: string
}

/** Every grant in the ledger, newest first: admin grants and automatic ones (welcome credits). */
export async function getCreditGrants(page = 1): Promise<ActionResult<Paged<CreditGrantRow>>> {
    try {
        await requireAdminAction(READ, "read")
        const p = Math.max(1, Math.floor(page) || 1)
        const isGrant = eq(creditLedger.kind, "grant")
        const [rows, [total]] = await db.batch([
            db.select({
                id: creditLedger.id,
                amountMicro: creditLedger.amountMicro,
                reason: creditLedger.description,
                ownerType: billingAccount.ownerType,
                userName: user.name,
                userEmail: user.email,
                workspaceName: workspace.name,
                grantedByName: sql<string | null>`(select u.name from admin_access a join "user" u on u.id = a.user_id where a.id = ${creditLedger.grantedBy})`,
                createdAt: creditLedger.createdAt,
            })
                .from(creditLedger)
                .innerJoin(billingAccount, eq(billingAccount.id, creditLedger.accountId))
                .leftJoin(user, and(eq(billingAccount.ownerType, "user"), eq(user.id, billingAccount.ownerId)))
                .leftJoin(workspace, and(eq(billingAccount.ownerType, "workspace"), eq(workspace.id, billingAccount.ownerId)))
                .where(isGrant)
                .orderBy(desc(creditLedger.createdAt))
                .limit(GRANTS_PER_PAGE)
                .offset((p - 1) * GRANTS_PER_PAGE),
            db.select({ n: count() }).from(creditLedger).where(isGrant),
        ])
        const n = Number(total?.n ?? 0)
        return ok({
            items: rows.map((r) => ({
                id: r.id,
                amountMicro: Number(r.amountMicro),
                reason: r.reason,
                ownerType: r.ownerType,
                ownerName: r.ownerType === "workspace" ? r.workspaceName : r.userName,
                ownerEmail: r.ownerType === "workspace" ? null : r.userEmail,
                grantedByName: r.grantedByName,
                createdAt: r.createdAt.toISOString(),
            })),
            total: n,
            page: p,
            pages: Math.max(1, Math.ceil(n / GRANTS_PER_PAGE)),
        })
    } catch (err) {
        return fail(err)
    }
}

/** Money > Billing: this Nepal month's rupees and credits, sales by credit pack, the top buying workspaces. */
export async function getBillingOverview(): Promise<ActionResult<BillingOverview>> {
    try {
        await requireAdminAction(READ, "read")
        return ok(await loadBillingOverview())
    } catch (err) {
        return fail(err, "billing.overview")
    }
}

export async function getBillingStats(): Promise<ActionResult<AdminBillingStats>> {
    try {
        await requireAdminAction(READ, "read")
        return ok(await adminBillingStats())
    } catch (err) {
        return fail(err)
    }
}

export async function getBillingPayments(filters: AdminPaymentFilters, page = 1): Promise<ActionResult<Paged<AdminPaymentRow>>> {
    try {
        await requireAdminAction(READ, "read")
        const clean: AdminPaymentFilters = {
            provider: filters.provider && isProviderId(filters.provider) ? filters.provider : undefined,
            status: filters.status && ["pending", "succeeded", "failed", "cancelled", "refunded"].includes(filters.status) ? filters.status : undefined,
            search: typeof filters.search === "string" ? filters.search.slice(0, 200) : undefined,
        }
        return ok(await adminListPayments(clean, Math.max(1, Math.floor(page) || 1)))
    } catch (err) {
        return fail(err)
    }
}

export async function getBillingSubscriptions(page = 1): Promise<ActionResult<Paged<AdminSubscriptionRow>>> {
    try {
        await requireAdminAction(READ, "read")
        return ok(await adminListSubscriptions(Math.max(1, Math.floor(page) || 1)))
    } catch (err) {
        return fail(err)
    }
}

export async function getUserCredits(userId: string): Promise<ActionResult<{ balanceMicro: number; entries: AdminLedgerRow[] }>> {
    try {
        await requireAdminAction(READ, "read")
        if (typeof userId !== "string" || !userId) return failWith("validation", "Choose a user.")
        return ok(await adminUserCredits(userId))
    } catch (err) {
        return fail(err)
    }
}

/** Ask the gateway again about one payment (server to server) and apply it if it is now paid. Idempotent. */
export async function recheckPayment(paymentId: string): Promise<ActionResult<ConfirmOutcome>> {
    try {
        const admin = await requireAdminAction(READ, "read")
        const row = await getPayment(paymentId)
        if (!row || !isProviderId(row.provider)) return failWith("notfound", "That payment could not be found.")
        const outcome = await confirmPayment(row.provider, row.id)
        if (outcome.appliedNow) {
            await db.insert(adminAuditLog).values({
                adminId: admin.id, action: "UPDATE", module: "billing", resourceType: "Payment", resourceId: row.id,
                description: "Rechecked a payment with the gateway and applied it",
                metadata: { provider: row.provider, amountMinor: row.amountMinor, currency: row.currency },
            })
        }
        revalidatePath("/billing")
        revalidatePath("/billing/payments")
        return ok(outcome)
    } catch (err) {
        return fail(err)
    }
}

/**
 * Grant (or, negative, take back) credits. `requestId` is made once per open sheet, so a double submit is ONE grant.
 * The audit row records who, whom, how many and why.
 */
export async function grantUserCredits(input: { userId: string; credits: number; reason: string; requestId: string }): Promise<ActionResult<{ balanceMicro: number; applied: boolean }>> {
    try {
        const admin = await requireAdminAction(GRANT, "write")
        const credits = Math.trunc(Number(input.credits))
        const reason = typeof input.reason === "string" ? input.reason.trim().slice(0, 300) : ""
        if (!input.userId) return failWith("validation", "Choose a user.")
        if (!Number.isFinite(credits) || credits === 0 || Math.abs(credits) > 1_000_000) return failWith("validation", "Enter a whole number of credits (not zero, at most 1,000,000).")
        if (!reason) return failWith("validation", "Say why, so the grant can be understood later.")
        if (typeof input.requestId !== "string" || !/^[0-9a-f-]{36}$/i.test(input.requestId)) return failWith("validation", "Open the sheet again and retry.")
        const r = await adminGrantCredits({ userId: input.userId, credits, reason, adminAccessId: admin.id, requestId: input.requestId })
        if (r.applied) {
            await db.insert(adminAuditLog).values({
                adminId: admin.id, action: credits > 0 ? "CREATE" : "UPDATE", module: "billing", resourceType: "User", resourceId: input.userId,
                description: credits > 0 ? `Granted ${credits} credits` : `Removed ${Math.abs(credits)} credits`,
                changes: { credits, balanceAfterMicro: r.balanceMicro },
                metadata: { reason, requestId: input.requestId },
            })
        }
        revalidatePath("/billing")
        revalidatePath("/billing/credits")
        return ok({ balanceMicro: r.balanceMicro, applied: r.applied })
    } catch (err) {
        return fail(err)
    }
}

/** Find a user by exact email for the grant sheet. */
export async function findBillingUser(email: string): Promise<ActionResult<{ id: string; name: string; email: string } | null>> {
    try {
        await requireAdminAction(GRANT, "write")
        const e = typeof email === "string" ? email.trim().toLowerCase() : ""
        if (!e) return ok(null)
        const [row] = await db.select({ id: user.id, name: user.name, email: user.email }).from(user).where(eq(user.email, e)).limit(1)
        return ok(row ?? null)
    } catch (err) {
        return fail(err)
    }
}
