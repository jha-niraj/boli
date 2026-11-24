/**
 * Workspace roles and per-product access - the catalogue and the checks, in ONE module (like apps/admin's
 * lib/permissions.ts). Plain TypeScript (no "use client" / "server-only"): server guards, actions and the members page
 * all read the same rules.
 *
 * - An OWNER has everything, including billing, members and deleting, whatever their stored access says.
 * - A MEMBER has exactly what is stored on their membership row, read through `normalizeAccess` (a missing or broken
 *   field is "no access", never a default grant).
 * - To add a product: a key in `WorkspaceAccess`, an entry in `WORKSPACE_PRODUCTS`, a line in `normalizeAccess` and
 *   `NO_ACCESS`. A product with levels lists them lowest first; a higher level includes every lower one.
 */

export const WORKSPACE_ROLES = ['owner', 'member'] as const
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number]

export const JAWAF_LEVELS = ['view', 'answer', 'edit', 'manage'] as const
export type JawafLevel = (typeof JAWAF_LEVELS)[number]

export interface WorkspaceAccess {
    kura: boolean
    api: boolean
    jawaf: { access: boolean; level: JawafLevel }
}

export type WorkspaceProduct = keyof WorkspaceAccess

export interface ProductLevel<L extends string = string> {
    id: L
    label: string
    description: string
}

export interface WorkspaceProductInfo {
    id: WorkspaceProduct
    label: string
    description: string
    /** Levels inside the product, lowest first. Absent = on or off. */
    levels?: readonly ProductLevel[]
}

export const JAWAF_LEVEL_INFO: readonly ProductLevel<JawafLevel>[] = [
    { id: 'view', label: 'View', description: 'See bots, conversations and contacts' },
    { id: 'answer', label: 'Answer questions', description: 'View, plus follow up with contacts and fix answers' },
    { id: 'edit', label: 'Edit knowledge', description: 'Answer, plus change pages, files, facts and Q&A' },
    { id: 'manage', label: 'Settings', description: 'Everything in Jawaf, including bot settings and publishing' },
]

export const WORKSPACE_PRODUCTS: readonly WorkspaceProductInfo[] = [
    { id: 'kura', label: 'Kura', description: 'Chat with Boli\'s model. Each person\'s chats stay their own.' },
    { id: 'api', label: 'API', description: 'Create and revoke API keys, see API usage.' },
    { id: 'jawaf', label: 'Jawaf', description: 'The business answer bot.', levels: JAWAF_LEVEL_INFO },
]

export const NO_ACCESS: WorkspaceAccess = { kura: false, api: false, jawaf: { access: false, level: 'view' } }
export const FULL_ACCESS: WorkspaceAccess = { kura: true, api: true, jawaf: { access: true, level: 'manage' } }
/** What the invite sheet starts from. */
export const DEFAULT_INVITE_ACCESS: WorkspaceAccess = { kura: true, api: false, jawaf: { access: false, level: 'view' } }

function isJawafLevel(v: unknown): v is JawafLevel {
    return typeof v === 'string' && (JAWAF_LEVELS as readonly string[]).includes(v)
}

/** Stored JSON -> a complete WorkspaceAccess. Anything missing or malformed is no access. */
export function normalizeAccess(raw: unknown): WorkspaceAccess {
    const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
    const j = o.jawaf && typeof o.jawaf === 'object' ? (o.jawaf as Record<string, unknown>) : {}
    return {
        kura: o.kura === true,
        api: o.api === true,
        jawaf: { access: j.access === true, level: isJawafLevel(j.level) ? j.level : 'view' },
    }
}

/** The access a member effectively has: an owner has everything. */
export function effectiveAccess(member: { role: WorkspaceRole; access: unknown }): WorkspaceAccess {
    return member.role === 'owner' ? FULL_ACCESS : normalizeAccess(member.access)
}

/** Whether `have` is at least `need` (levels are ordered lowest first). */
export function jawafLevelAtLeast(have: JawafLevel, need: JawafLevel): boolean {
    return JAWAF_LEVELS.indexOf(have) >= JAWAF_LEVELS.indexOf(need)
}

/** The one check every guard and screen uses. `level` applies to products with levels (Jawaf). */
export function canUseProduct(member: { role: WorkspaceRole; access: unknown } | null | undefined, product: WorkspaceProduct, level?: JawafLevel): boolean {
    if (!member) return false
    if (member.role === 'owner') return true
    const a = normalizeAccess(member.access)
    if (product === 'jawaf') return a.jawaf.access && (!level || jawafLevelAtLeast(a.jawaf.level, level))
    return a[product]
}

/** One line for a member row: "Kura, API, Jawaf (Edit knowledge)" or "No products". */
export function accessSummary(member: { role: WorkspaceRole; access: unknown }): string {
    if (member.role === 'owner') return 'Everything, including billing and members'
    const a = normalizeAccess(member.access)
    const parts: string[] = []
    if (a.kura) parts.push('Kura')
    if (a.api) parts.push('API')
    if (a.jawaf.access) parts.push(`Jawaf (${JAWAF_LEVEL_INFO.find((l) => l.id === a.jawaf.level)?.label ?? 'View'})`)
    return parts.length ? parts.join(', ') : 'No products yet'
}

export function formatWorkspaceRole(role: WorkspaceRole): string {
    return role === 'owner' ? 'Owner' : 'Member'
}

/** "Niraj's workspace" - the personal workspace's name, from the person's first name. */
export function personalWorkspaceName(name: string | null | undefined): string {
    const first = (name ?? '').trim().split(/\s+/)[0]
    return first ? `${first.slice(0, 40)}'s workspace` : 'My workspace'
}

/** How long an emailed invitation works. */
export const WORKSPACE_INVITE_DAYS = 7
/** Members per workspace (owner included) - a sanity cap, raise per need. */
export const MAX_WORKSPACE_MEMBERS = 50
/** Workspaces one person may OWN (their personal one included). Extra workspaces start with 0 credits. */
export const MAX_OWNED_WORKSPACES = 5
/** The cookie that remembers the current workspace (validated against membership on every read). */
export const WORKSPACE_COOKIE = 'boli-workspace'
