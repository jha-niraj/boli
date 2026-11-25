// Boli platform tables: API keys, one row per model call, feedback and the About page's contact messages.
// Every per-user row carries `userId`; keys and requests also carry `workspaceId` (the account they belong to and charge), and each table is listed in
// packages/erasure/src/user.ts. Plan: plan/main/platform/platform-v0.md.
import { bigint, index, integer, jsonb, pgTable, smallint, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { user } from './core'
import { aiConversations } from './ai'
import { workspace } from './workspace'

/**
 * An API key. The secret (`boli_sk_` + 32 random characters) is shown ONCE at creation and never stored: only its
 * SHA-256 hex (`keyHash`, unique) and a display prefix (`boli_sk_ab12cd34`). Revoking sets `revokedAt` and keeps the
 * row, so usage history still shows the key's name.
 */
export const apiKey = pgTable(
    'api_key',
    {
        id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
        /** Who created it (kept for history; the key belongs to the workspace). */
        userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
        /** The workspace the key belongs to and charges. Nullable only until scripts/backfill-workspaces.mjs has run. */
        workspaceId: text('workspace_id').references(() => workspace.id, { onDelete: 'cascade' }),
        name: text('name').notNull(),
        /** What the list shows before the mask: the first 16 characters (`boli_sk_` + 8). */
        prefix: text('prefix').notNull(),
        keyHash: text('key_hash').notNull(),
        createdAt: timestamp('created_at').notNull().defaultNow(),
        lastUsedAt: timestamp('last_used_at'),
        revokedAt: timestamp('revoked_at'),
    },
    (t) => [
        uniqueIndex('api_key_hash_uq').on(t.keyHash),
        index('api_key_user_created_idx').on(t.userId, t.createdAt),
        index('api_key_workspace_created_idx').on(t.workspaceId, t.createdAt),
    ],
)

export const INFERENCE_SOURCES = ['kura', 'api'] as const
export type InferenceSource = (typeof INFERENCE_SOURCES)[number]

export const INFERENCE_STATUSES = ['ok', 'error'] as const
export type InferenceStatus = (typeof INFERENCE_STATUSES)[number]

/**
 * One row per call to our model, from Kura or the API. Metadata only: no prompt or answer text is stored here
 * (Kura's own messages live in ai_message). `costMicro` is in micro-credits (1 credit = 1,000,000), the same unit as
 * billing_account.balance_micro. The id doubles as the ledger idempotency key (`spend:<id>`).
 */
export const inferenceRequest = pgTable(
    'inference_request',
    {
        id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
        userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
        /** The workspace charged. Nullable only until scripts/backfill-workspaces.mjs has run. */
        workspaceId: text('workspace_id').references(() => workspace.id, { onDelete: 'cascade' }),
        apiKeyId: text('api_key_id').references(() => apiKey.id, { onDelete: 'set null' }),
        source: text('source').$type<InferenceSource>().notNull(),
        /** The public model id (`boli-chat`). */
        model: text('model').notNull(),
        conversationId: text('conversation_id').references(() => aiConversations.id, { onDelete: 'set null' }),
        inputTokens: integer('input_tokens').notNull().default(0),
        outputTokens: integer('output_tokens').notNull().default(0),
        /** Thinking tokens (already included in outputTokens; billed as output). */
        reasoningTokens: integer('reasoning_tokens').notNull().default(0),
        costMicro: bigint('cost_micro', { mode: 'number' }).notNull().default(0),
        latencyMs: integer('latency_ms'),
        /** Time to the first streamed token, when streaming. */
        firstTokenMs: integer('first_token_ms'),
        stream: smallint('stream').notNull().default(0),
        status: text('status').$type<InferenceStatus>().notNull().default('ok'),
        /** OpenAI-style error code when status = error (invalid_request, model_unavailable, ...). */
        errorCode: text('error_code'),
        createdAt: timestamp('created_at').notNull().defaultNow(),
    },
    (t) => [
        index('inference_request_user_created_idx').on(t.userId, t.createdAt),
        index('inference_request_key_created_idx').on(t.apiKeyId, t.createdAt),
        index('inference_request_workspace_created_idx').on(t.workspaceId, t.createdAt),
    ],
)

/** The dashboard header's Feedback popover. */
export const feedback = pgTable(
    'feedback',
    {
        id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
        userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
        message: text('message').notNull(),
        /** 1-5, optional. */
        rating: smallint('rating'),
        /** The page it was sent from (a route, no query string). */
        page: text('page'),
        /** When an admin marked it handled (admin Inbox); NULL = still open. */
        handledAt: timestamp('handled_at'),
        /** The admin_access id that marked it handled (no FK: the row outlives the admin). */
        handledBy: text('handled_by'),
        createdAt: timestamp('created_at').notNull().defaultNow(),
    },
    (t) => [index('feedback_created_idx').on(t.createdAt)],
)

/**
 * The site's /contact form (public; no account needed). `details` holds the topic's extra fields - for the Jawaf
 * pilot `{ kind: "jawaf_pilot", businessName, businessWebsite?, businessType, city, phone? }` - and is narrowed by the
 * reader (apps/admin/schemas/inbox.ts). Script: packages/db/scripts/contact-details.sql.
 */
export const contactMessage = pgTable(
    'contact_message',
    {
        id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
        name: text('name').notNull(),
        email: text('email').notNull(),
        topic: text('topic'),
        message: text('message').notNull(),
        /** The topic's extra fields (see above); NULL for topics without any. */
        details: jsonb('details'),
        /** SHA-256 of the sender's IP: only for the 5-per-hour limit, never shown. */
        ipHash: text('ip_hash'),
        /** When an admin marked it handled (admin Inbox); NULL = still open. */
        handledAt: timestamp('handled_at'),
        /** The admin_access id that marked it handled (no FK: the row outlives the admin). */
        handledBy: text('handled_by'),
        createdAt: timestamp('created_at').notNull().defaultNow(),
    },
    (t) => [index('contact_message_created_idx').on(t.createdAt), index('contact_message_ip_created_idx').on(t.ipHash, t.createdAt)],
)
