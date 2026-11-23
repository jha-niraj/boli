// Straight from the plain modules, not filters.tsx ("use client"): the server page imports this file.
import { createFilterQuery } from "@repo/ui/components/reui/filters/filters-query"
import type { FilterField, FilterQuery, FilterRule } from "@repo/ui/components/reui/filters/filters-types"
import { matchesFilterQuery } from "@repo/ui/lib/filter-match"
import type { UserFilters, UserRole } from "@/types/admin"

/**
 * The Users list's query plumbing - a plain module (no "use client"), so the server page can read the page size and
 * the client the keys, fields and filter resolution.
 */
export const USERS_PAGE_SIZE = 25

export const USER_KEYS = {
    all: ["users"] as const,
    list: (page: number, search: string, filters: UserFilters) => ["users", "list", { page, search, filters }] as const,
    stats: ["users", "stats"] as const,
    detail: (id: string) => ["users", "detail", id] as const,
    platform: (id: string) => ["users", "platform", id] as const,
}

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
    { value: "USER", label: "User" },
    { value: "ADMIN", label: "Admin" },
]
const STATUS_OPTIONS = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
]
const VERIFIED_OPTIONS = [
    { value: "yes", label: "Verified" },
    { value: "no", label: "Not verified" },
]

/** The toolbar's filter fields (ReUI Filters, basic chips joined by AND). */
export const USER_FILTER_FIELDS: FilterField[] = [
    { id: "status", label: "Status", type: "select", options: STATUS_OPTIONS },
    { id: "role", label: "Role", type: "select", options: ROLE_OPTIONS },
    { id: "verified", label: "Email", type: "select", options: VERIFIED_OPTIONS },
]

export const EMPTY_USER_QUERY: FilterQuery = createFilterQuery([])

function rulesFor(query: FilterQuery, field: string): FilterRule[] {
    const out: FilterRule[] = []
    const walk = (nodes: FilterQuery["rules"]) => {
        for (const n of nodes) {
            if (n.type === "rule") { if (n.path[0] === field) out.push(n) }
            else walk(n.rules)
        }
    }
    walk(query.rules)
    return out
}

/** The values a field still allows under the chips on it; undefined when there is no chip on that field. */
function allowed<T extends string>(query: FilterQuery, field: string, values: readonly T[]): T[] | undefined {
    const rules = rulesFor(query, field)
    if (rules.length === 0) return undefined
    const sub = createFilterQuery(rules)
    return values.filter((v) => matchesFilterQuery(sub, (f) => (f === field ? v : undefined)))
}

/**
 * The chips, resolved to what the server filters on. Basic chips are AND-ed, so each field's chips narrow that field
 * alone - testing every option of the field against its chips gives the exact set to send (no SQL from the browser).
 */
export function resolveUserFilters(query: FilterQuery): UserFilters {
    const roles = allowed(query, "role", ["USER", "ADMIN"] as const)
    const status = allowed(query, "status", ["active", "inactive"] as const)
    const verified = allowed(query, "verified", ["yes", "no"] as const)
    const out: UserFilters = {}
    if (roles) out.roles = roles
    if (status) out.active = status.map((s) => s === "active")
    if (verified) out.verified = verified.map((v) => v === "yes")
    return out
}
