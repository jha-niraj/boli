// Workspaces (plan/main/jawaf/jawaf-v1.md, "Accounts and teams"): the account level above a person. Credits (the
// billing_account with ownerType 'workspace'), API keys, Kura conversations and (later) Jawaf bots belong to a
// workspace. Every user has one PERSONAL workspace (`personalOwnerId` = their user id, unique) created on sign-up; a
// person may belong to several. Roles are owner and member; a member's per-product access is the JSON catalogued in
// @repo/boli/workspace-access (normalised on every read - the column is never trusted as-is).
//
// Additive SQL: packages/db/scripts/workspaces.sql. Backfill of existing users: scripts/backfill-workspaces.mjs.
import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { user } from './core'

export const WORKSPACE_MEMBER_ROLES = ['owner', 'member'] as const
export type WorkspaceMemberRole = (typeof WORKSPACE_MEMBER_ROLES)[number]

export const WORKSPACE_INVITATION_STATUSES = ['pending', 'accepted', 'revoked'] as const
export type WorkspaceInvitationStatus = (typeof WORKSPACE_INVITATION_STATUSES)[number]

export const workspace = pgTable(
    'workspace',
    {
        id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
        name: text('name').notNull(),
        /** Set only on a person's personal workspace (one per user, unique); null on a shared one. */
        personalOwnerId: text('personal_owner_id').references(() => user.id, { onDelete: 'cascade' }),
        createdById: text('created_by_id').references(() => user.id, { onDelete: 'set null' }),
        createdAt: timestamp('created_at').notNull().defaultNow(),
        updatedAt: timestamp('updated_at').notNull().defaultNow(),
    },
    (t) => [uniqueIndex('workspace_personal_owner_uq').on(t.personalOwnerId)],
)

export const workspaceMember = pgTable(
    'workspace_member',
    {
        id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
        workspaceId: text('workspace_id').notNull().references(() => workspace.id, { onDelete: 'cascade' }),
        userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
        role: text('role').$type<WorkspaceMemberRole>().notNull().default('member'),
        /** Per-product access (@repo/boli/workspace-access `WorkspaceAccess`). An owner has everything whatever this says. */
        access: jsonb('access').$type<unknown>().notNull().default({}),
        invitedById: text('invited_by_id').references(() => user.id, { onDelete: 'set null' }),
        createdAt: timestamp('created_at').notNull().defaultNow(),
        updatedAt: timestamp('updated_at').notNull().defaultNow(),
    },
    (t) => [
        uniqueIndex('workspace_member_ws_user_uq').on(t.workspaceId, t.userId),
        index('workspace_member_user_idx').on(t.userId),
    ],
)

/**
 * An emailed invitation. The token (the /join link's secret) is never stored: only its SHA-256 hex. Resending makes a
 * new token (the old link stops working) and a new 7-day expiry. One PENDING invitation per (workspace, email).
 */
export const workspaceInvitation = pgTable(
    'workspace_invitation',
    {
        id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
        workspaceId: text('workspace_id').notNull().references(() => workspace.id, { onDelete: 'cascade' }),
        /** Lower-cased. */
        email: text('email').notNull(),
        tokenHash: text('token_hash').notNull(),
        /** The access the member gets on accepting. */
        access: jsonb('access').$type<unknown>().notNull().default({}),
        status: text('status').$type<WorkspaceInvitationStatus>().notNull().default('pending'),
        invitedById: text('invited_by_id').references(() => user.id, { onDelete: 'set null' }),
        acceptedById: text('accepted_by_id').references(() => user.id, { onDelete: 'set null' }),
        acceptedAt: timestamp('accepted_at'),
        expiresAt: timestamp('expires_at').notNull(),
        sentCount: integer('sent_count').notNull().default(1),
        lastSentAt: timestamp('last_sent_at').notNull().defaultNow(),
        createdAt: timestamp('created_at').notNull().defaultNow(),
    },
    (t) => [
        uniqueIndex('workspace_invitation_token_uq').on(t.tokenHash),
        uniqueIndex('workspace_invitation_pending_uq').on(t.workspaceId, t.email).where(sql`status = 'pending'`),
        index('workspace_invitation_ws_status_idx').on(t.workspaceId, t.status),
    ],
)
