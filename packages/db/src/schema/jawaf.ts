// Jawaf (plan/main/jawaf/jawaf-v1.md): a business's answer bot. Every row carries `workspace_id` AND `bot_id` (the bot
// row itself: `workspace_id`), and every query filters by them. Deleting a bot deletes everything under it (FK cascade);
// deleting a workspace deletes its bots.
//
// Layers: crawled pages + files (jawaf_page) and owner knowledge (jawaf_fact_section, jawaf_qa, jawaf_note) are cut into
// jawaf_chunk rows (BGE-M3 vector(1024) + a `simple` tsvector + trigram) - the one table the answer engine searches.
// Long work (reading pages, files, drafting facts) is a jawaf_job row advanced in small slices (lib/jawaf/jobs.ts).
//
// Additive SQL: packages/db/scripts/jawaf.sql (pgvector + pg_trgm extensions, tables, HNSW / GIN indexes).
// Tables vs notes: an owner "table" is a jawaf_note with kind 'table' (title + columns/rows jsonb) - one list, one
// editor, one chunker; a separate table would only duplicate the CRUD.
import { sql } from 'drizzle-orm'
import { bigint, boolean, customType, index, integer, jsonb, pgTable, smallint, text, timestamp, uniqueIndex, vector } from 'drizzle-orm/pg-core'
import { adminAccess, user } from './core'
import { workspace } from './workspace'

/** BGE-M3 dense vectors. */
export const JAWAF_EMBED_DIMS = 1024

const tsvector = customType<{ data: string }>({ dataType: () => 'tsvector' })

type Owner = 'owner' | 'fix' | 'import' | 'draft'

export const jawafBot = pgTable(
    'jawaf_bot',
    {
        id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
        workspaceId: text('workspace_id').notNull().references(() => workspace.id, { onDelete: 'cascade' }),
        name: text('name').notNull(),
        /** The public page path app.bolihq.com/j/<slug>; unique across every workspace. */
        slug: text('slug').notNull(),
        businessType: text('business_type').notNull().default('other'),
        website: text('website'),
        tone: text('tone').notNull().default('friendly'),
        length: text('length').notNull().default('balanced'),
        instructions: text('instructions').notNull().default(''),
        greeting: text('greeting').notNull().default(''),
        suggestedQuestions: jsonb('suggested_questions').$type<unknown>().notNull().default([]),
        /** types/jawaf.ts JawafContactFields (narrowed on read). */
        contactFields: jsonb('contact_fields').$type<unknown>().notNull().default({}),
        /** The look being edited (types/jawaf.ts JawafPageLook). */
        look: jsonb('look').$type<unknown>().notNull().default({}),
        /** The look the public page and widget show; set by Publish. Null = never published (use `look`). */
        publishedLook: jsonb('published_look').$type<unknown>(),
        showSources: boolean('show_sources').notNull().default(true),
        brandingRemoved: boolean('branding_removed').notNull().default(false),
        /** A demo built by the Boli team for a prospect; shows the "Claim it" ribbon. */
        demo: boolean('demo').notNull().default(false),
        /** SHA-256 hex of the one-time claim code (never the code). */
        claimCodeHash: text('claim_code_hash'),
        claimExpiresAt: timestamp('claim_expires_at'),
        trainingOptIn: boolean('training_opt_in').notNull().default(false),
        status: text('status').notNull().default('draft'),
        setupStep: text('setup_step').notNull().default('business'),
        /** Admin overrides of the per-bot limits (@repo/boli/jawaf JawafLimitOverrides). */
        limits: jsonb('limits').$type<unknown>().notNull().default({}),
        /** An admin paused the public page / widget / API (admin Jawaf > All bots); the page says it is paused. */
        paused: boolean('paused').notNull().default(false),
        pausedReason: text('paused_reason'),
        pausedAt: timestamp('paused_at'),
        /** Free first-read web pages used (JAWAF_PRICES.freePagesPerBot). Moved by one conditional UPDATE per page. */
        freePagesUsed: integer('free_pages_used').notNull().default(0),
        createdById: text('created_by_id').references(() => user.id, { onDelete: 'set null' }),
        createdAt: timestamp('created_at').notNull().defaultNow(),
        updatedAt: timestamp('updated_at').notNull().defaultNow(),
    },
    (t) => [uniqueIndex('jawaf_bot_slug_uq').on(t.slug), index('jawaf_bot_ws_idx').on(t.workspaceId, t.createdAt)],
)

export const jawafSource = pgTable(
    'jawaf_source',
    {
        id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
        workspaceId: text('workspace_id').notNull().references(() => workspace.id, { onDelete: 'cascade' }),
        botId: text('bot_id').notNull().references(() => jawafBot.id, { onDelete: 'cascade' }),
        /** site (a mapped website) / url (one added page) / file / qa_csv (an imported Q&A file, kept for history). */
        kind: text('kind').notNull(),
        url: text('url'),
        /** R2 key of an uploaded file. */
        fileKey: text('file_key'),
        fileName: text('file_name'),
        fileSize: integer('file_size'),
        mimeType: text('mime_type'),
        /** Pages counted (and charged) for a file. */
        filePages: integer('file_pages'),
        status: text('status').notNull().default('queued'),
        error: text('error'),
        /** URLs the map found (before the limit and filters). */
        pagesFound: integer('pages_found').notNull().default(0),
        lastReadAt: timestamp('last_read_at'),
        /** The weekly re-read is due (sites only). */
        nextReadAt: timestamp('next_read_at'),
        createdById: text('created_by_id').references(() => user.id, { onDelete: 'set null' }),
        createdAt: timestamp('created_at').notNull().defaultNow(),
        updatedAt: timestamp('updated_at').notNull().defaultNow(),
    },
    (t) => [index('jawaf_source_bot_idx').on(t.botId, t.kind), index('jawaf_source_next_read_idx').on(t.nextReadAt)],
)

export const jawafPage = pgTable(
    'jawaf_page',
    {
        id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
        workspaceId: text('workspace_id').notNull().references(() => workspace.id, { onDelete: 'cascade' }),
        botId: text('bot_id').notNull().references(() => jawafBot.id, { onDelete: 'cascade' }),
        sourceId: text('source_id').notNull().references(() => jawafSource.id, { onDelete: 'cascade' }),
        /** Null for a file's text. */
        url: text('url'),
        /** The URL normalised for dedupe (no hash, no trailing slash, lower-case host); unique per bot. */
        urlKey: text('url_key'),
        title: text('title'),
        markdown: text('markdown'),
        /** SHA-256 hex of the markdown: an unchanged page is not re-chunked or re-embedded. */
        contentHash: text('content_hash'),
        /** The owner's choice. */
        status: text('status').notNull().default('included'),
        readStatus: text('read_status').notNull().default('pending'),
        /** Versus the read before: new / changed / removed; null = unchanged. */
        change: text('change'),
        suggested: boolean('suggested').notNull().default(false),
        /** Mapper rank, useful pages first. */
        rank: integer('rank').notNull().default(0),
        chars: integer('chars').notNull().default(0),
        error: text('error'),
        /** First read charged: 'free' (within the bot's free pages) or 'paid'; null = not billed yet. */
        billed: text('billed'),
        /** A number here differs from the approved Prices and fees. */
        disagreesWithFacts: boolean('disagrees_with_facts').notNull().default(false),
        lastReadAt: timestamp('last_read_at'),
        createdAt: timestamp('created_at').notNull().defaultNow(),
        updatedAt: timestamp('updated_at').notNull().defaultNow(),
    },
    (t) => [
        uniqueIndex('jawaf_page_bot_url_uq').on(t.botId, t.urlKey),
        index('jawaf_page_bot_status_idx').on(t.botId, t.status, t.readStatus),
        index('jawaf_page_source_idx').on(t.sourceId),
    ],
)

export const jawafFactSection = pgTable(
    'jawaf_fact_section',
    {
        id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
        workspaceId: text('workspace_id').notNull().references(() => workspace.id, { onDelete: 'cascade' }),
        botId: text('bot_id').notNull().references(() => jawafBot.id, { onDelete: 'cascade' }),
        key: text('key').notNull(),
        title: text('title').notNull(),
        html: text('html').notNull().default(''),
        text: text('text').notNull().default(''),
        /** { columns, rows } - Prices and fees. */
        table: jsonb('table').$type<unknown>(),
        /** Only approved sections are sent to the model. */
        approved: boolean('approved').notNull().default(false),
        /** Drafted by Jawaf from the website (Review step). */
        drafted: boolean('drafted').notNull().default(false),
        sort: integer('sort').notNull().default(0),
        createdAt: timestamp('created_at').notNull().defaultNow(),
        updatedAt: timestamp('updated_at').notNull().defaultNow(),
    },
    (t) => [index('jawaf_fact_bot_idx').on(t.botId, t.sort)],
)

export const jawafQa = pgTable(
    'jawaf_qa',
    {
        id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
        workspaceId: text('workspace_id').notNull().references(() => workspace.id, { onDelete: 'cascade' }),
        botId: text('bot_id').notNull().references(() => jawafBot.id, { onDelete: 'cascade' }),
        question: text('question').notNull(),
        phrasings: text('phrasings').array().notNull().default(sql`'{}'::text[]`),
        answer: text('answer').notNull(),
        source: text('source').$type<Owner>().notNull().default('owner'),
        /** Drafted FAQs wait for Review; only approved pairs are searched. */
        approved: boolean('approved').notNull().default(true),
        /** The playground / visitor message a "Fix this answer" came from. */
        sourceMessageId: text('source_message_id'),
        createdById: text('created_by_id').references(() => user.id, { onDelete: 'set null' }),
        createdAt: timestamp('created_at').notNull().defaultNow(),
        updatedAt: timestamp('updated_at').notNull().defaultNow(),
    },
    (t) => [index('jawaf_qa_bot_idx').on(t.botId, t.createdAt)],
)

export const jawafNote = pgTable(
    'jawaf_note',
    {
        id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
        workspaceId: text('workspace_id').notNull().references(() => workspace.id, { onDelete: 'cascade' }),
        botId: text('bot_id').notNull().references(() => jawafBot.id, { onDelete: 'cascade' }),
        /** note (rich text) or table (columns/rows). */
        kind: text('kind').notNull().default('note'),
        title: text('title').notNull(),
        html: text('html').notNull().default(''),
        text: text('text').notNull().default(''),
        table: jsonb('table').$type<unknown>(),
        createdById: text('created_by_id').references(() => user.id, { onDelete: 'set null' }),
        createdAt: timestamp('created_at').notNull().defaultNow(),
        updatedAt: timestamp('updated_at').notNull().defaultNow(),
    },
    (t) => [index('jawaf_note_bot_idx').on(t.botId, t.updatedAt)],
)

/**
 * The search table. `origin_kind` + `origin_id` say what a chunk came from (page / file -> jawaf_page.id, qa ->
 * jawaf_qa.id, note -> jawaf_note.id, fact -> jawaf_fact_section.id); re-indexing an origin deletes its chunks and
 * inserts new ones in one batch. `tsv` is generated by Postgres; `embedding` is BGE-M3 (cosine).
 */
export const jawafChunk = pgTable(
    'jawaf_chunk',
    {
        id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
        workspaceId: text('workspace_id').notNull().references(() => workspace.id, { onDelete: 'cascade' }),
        botId: text('bot_id').notNull().references(() => jawafBot.id, { onDelete: 'cascade' }),
        originKind: text('origin_kind').notNull(),
        originId: text('origin_id').notNull(),
        /** Set for page / file chunks (deleting a source drops them without a join). */
        sourceId: text('source_id'),
        /** "About us > Fees" - the heading path the text sits under. */
        heading: text('heading').notNull().default(''),
        text: text('text').notNull(),
        /** Order inside the origin. */
        seq: integer('seq').notNull().default(0),
        tokens: integer('tokens').notNull().default(0),
        embedding: vector('embedding', { dimensions: JAWAF_EMBED_DIMS }),
        tsv: tsvector('tsv').generatedAlwaysAs(sql`to_tsvector('simple', coalesce(heading, '') || ' ' || text)`),
        createdAt: timestamp('created_at').notNull().defaultNow(),
    },
    (t) => [
        index('jawaf_chunk_bot_origin_idx').on(t.botId, t.originKind, t.originId),
        index('jawaf_chunk_source_idx').on(t.sourceId),
        index('jawaf_chunk_embedding_hnsw').using('hnsw', t.embedding.op('vector_cosine_ops')),
        index('jawaf_chunk_tsv_gin').using('gin', t.tsv),
        index('jawaf_chunk_text_trgm').using('gin', t.text.op('gin_trgm_ops')),
    ],
)

/**
 * A long job, advanced in slices of < 25 s by the page's poll (`POST /api/jawaf/jobs/<id>/tick`) and by the hourly
 * cron. `lease_until` is the lock: a slice claims the row with one conditional UPDATE, so two ticks never run the same
 * job at once. One active job per (bot, kind) (partial unique index).
 */
export const jawafJob = pgTable(
    'jawaf_job',
    {
        id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
        workspaceId: text('workspace_id').notNull().references(() => workspace.id, { onDelete: 'cascade' }),
        botId: text('bot_id').notNull().references(() => jawafBot.id, { onDelete: 'cascade' }),
        kind: text('kind').notNull(),
        status: text('status').notNull().default('queued'),
        /** { done, total, label } */
        progress: jsonb('progress').$type<unknown>().notNull().default({}),
        /** Job-kind state between slices (e.g. the Sarvam job id, the drafting step). */
        cursor: jsonb('cursor').$type<unknown>().notNull().default({}),
        sourceId: text('source_id'),
        error: text('error'),
        errorCode: text('error_code'),
        leaseUntil: timestamp('lease_until'),
        slices: integer('slices').notNull().default(0),
        createdById: text('created_by_id').references(() => user.id, { onDelete: 'set null' }),
        createdAt: timestamp('created_at').notNull().defaultNow(),
        startedAt: timestamp('started_at'),
        finishedAt: timestamp('finished_at'),
        updatedAt: timestamp('updated_at').notNull().defaultNow(),
    },
    (t) => [
        uniqueIndex('jawaf_job_active_uq').on(t.botId, t.kind, sql`coalesce(${t.sourceId}, '')`).where(sql`status in ('queued', 'running')`),
        index('jawaf_job_status_idx').on(t.status, t.leaseUntil),
        index('jawaf_job_bot_idx').on(t.botId, t.createdAt),
    ],
)

export const jawafConversation = pgTable(
    'jawaf_conversation',
    {
        id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
        workspaceId: text('workspace_id').notNull().references(() => workspace.id, { onDelete: 'cascade' }),
        botId: text('bot_id').notNull().references(() => jawafBot.id, { onDelete: 'cascade' }),
        /** The visitor's cookie id (public channels) - remembered 30 days on the same device. */
        visitorId: text('visitor_id'),
        /** The signed-in person (playground only). */
        userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
        channel: text('channel').notNull(),
        /** The page the widget sat on. */
        pageUrl: text('page_url'),
        /** The script of the visitor's first message. */
        script: text('script'),
        contactCaptured: boolean('contact_captured').notNull().default(false),
        messageCount: integer('message_count').notNull().default(0),
        startedAt: timestamp('started_at').notNull().defaultNow(),
        lastAt: timestamp('last_at').notNull().defaultNow(),
    },
    (t) => [
        index('jawaf_conversation_bot_last_idx').on(t.botId, t.lastAt),
        index('jawaf_conversation_visitor_idx').on(t.botId, t.visitorId),
    ],
)

export const jawafMessage = pgTable(
    'jawaf_message',
    {
        id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
        workspaceId: text('workspace_id').notNull().references(() => workspace.id, { onDelete: 'cascade' }),
        botId: text('bot_id').notNull().references(() => jawafBot.id, { onDelete: 'cascade' }),
        conversationId: text('conversation_id').notNull().references(() => jawafConversation.id, { onDelete: 'cascade' }),
        role: text('role').$type<'user' | 'assistant'>().notNull(),
        text: text('text').notNull().default(''),
        /** Assistant rows: JawafAnswerSource[]. */
        sources: jsonb('sources').$type<unknown>(),
        /** Assistant rows: false = not found (the contact card was shown). */
        answered: boolean('answered'),
        /** Assistant rows: answered / not_found / credits / offline / error. */
        status: text('status'),
        script: text('script'),
        /** 1 = helpful, -1 = not helpful. */
        rating: smallint('rating'),
        ratingReason: text('rating_reason'),
        latencyMs: integer('latency_ms'),
        inputTokens: integer('input_tokens').notNull().default(0),
        outputTokens: integer('output_tokens').notNull().default(0),
        costMicro: bigint('cost_micro', { mode: 'number' }).notNull().default(0),
        /** Retrieval scores for tuning (best vector similarity, keyword hit) - no visitor data. */
        retrieval: jsonb('retrieval').$type<unknown>(),
        createdAt: timestamp('created_at').notNull().defaultNow(),
    },
    (t) => [
        index('jawaf_message_conv_idx').on(t.conversationId, t.createdAt),
        index('jawaf_message_bot_answered_idx').on(t.botId, t.answered, t.createdAt),
    ],
)

export const jawafContact = pgTable(
    'jawaf_contact',
    {
        id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
        workspaceId: text('workspace_id').notNull().references(() => workspace.id, { onDelete: 'cascade' }),
        botId: text('bot_id').notNull().references(() => jawafBot.id, { onDelete: 'cascade' }),
        conversationId: text('conversation_id').references(() => jawafConversation.id, { onDelete: 'set null' }),
        /** { name, phone, email, interest, preferredTime, <custom field id>: value } */
        fields: jsonb('fields').$type<unknown>().notNull().default({}),
        status: text('status').notNull().default('new'),
        notes: text('notes').notNull().default(''),
        followUpAt: timestamp('follow_up_at'),
        summary: text('summary'),
        intent: text('intent'),
        channel: text('channel').notNull(),
        createdAt: timestamp('created_at').notNull().defaultNow(),
        updatedAt: timestamp('updated_at').notNull().defaultNow(),
    },
    (t) => [index('jawaf_contact_bot_idx').on(t.botId, t.createdAt), index('jawaf_contact_bot_status_idx').on(t.botId, t.status)],
)

/**
 * Visitor answers per workspace per Nepal-time month ("YYYY-MM"): one upsert-increment per answer decides free vs
 * charged (JAWAF_PRICES.freeAnswersPerMonth). Playground answers are not counted.
 */
export const jawafUsageMonth = pgTable(
    'jawaf_usage_month',
    {
        id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
        workspaceId: text('workspace_id').notNull().references(() => workspace.id, { onDelete: 'cascade' }),
        month: text('month').notNull(),
        answers: integer('answers').notNull().default(0),
        chargedMicro: bigint('charged_micro', { mode: 'number' }).notNull().default(0),
        updatedAt: timestamp('updated_at').notNull().defaultNow(),
    },
    (t) => [uniqueIndex('jawaf_usage_month_ws_uq').on(t.workspaceId, t.month)],
)

// ---------------------------------------------------------------------------------------------------------------------
// Admin: demo prospects and claim links (plan/admin/jawaf/admin-v1.md "Jawaf in admin"). SQL: scripts/jawaf-admin.sql.
// ---------------------------------------------------------------------------------------------------------------------

export const JAWAF_PROSPECT_STAGES = ['sent', 'met', 'pilot', 'paying', 'lost'] as const
export type JawafProspectStage = (typeof JAWAF_PROSPECT_STAGES)[number]

/**
 * A business we built a demo bot for (the demo tracker). Not tenant data: it belongs to the Boli team, so it has no
 * workspace_id; the bot it points at lives in the "Boli Demos" house workspace until it is claimed.
 */
export const jawafProspect = pgTable(
    'jawaf_prospect',
    {
        id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
        business: text('business').notNull(),
        website: text('website'),
        businessType: text('business_type').notNull().default('other'),
        sector: text('sector'),
        city: text('city'),
        contactName: text('contact_name'),
        phone: text('phone'),
        email: text('email'),
        stage: text('stage').$type<JawafProspectStage>().notNull().default('sent'),
        /** The next step's day (stored as a UTC instant at midnight Nepal time). */
        nextStepAt: timestamp('next_step_at'),
        notes: text('notes').notNull().default(''),
        /** The admin who owns the relationship (user.id of an admin). */
        ownerUserId: text('owner_user_id').references(() => user.id, { onDelete: 'set null' }),
        botId: text('bot_id').references(() => jawafBot.id, { onDelete: 'set null' }),
        /** The contact form message (Communications > Inbox) the demo was built from. */
        sourceContactMessageId: text('source_contact_message_id'),
        createdById: text('created_by_id').references(() => user.id, { onDelete: 'set null' }),
        createdAt: timestamp('created_at').notNull().defaultNow(),
        updatedAt: timestamp('updated_at').notNull().defaultNow(),
    },
    (t) => [
        index('jawaf_prospect_stage_idx').on(t.stage, t.nextStepAt),
        index('jawaf_prospect_bot_idx').on(t.botId),
        index('jawaf_prospect_created_idx').on(t.createdAt),
    ],
)

/**
 * A one-time claim link for a demo bot: `/claim/<token>` on the app. Only the SHA-256 hex of the token is stored; the
 * token is shown once. Works for 30 days, once; a new link for the same bot revokes the older open ones.
 */
export const jawafClaim = pgTable(
    'jawaf_claim',
    {
        id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
        botId: text('bot_id').notNull().references(() => jawafBot.id, { onDelete: 'cascade' }),
        prospectId: text('prospect_id').references(() => jawafProspect.id, { onDelete: 'set null' }),
        tokenHash: text('token_hash').notNull(),
        createdByAdminId: text('created_by_admin_id').references(() => adminAccess.id, { onDelete: 'set null' }),
        expiresAt: timestamp('expires_at').notNull(),
        sentAt: timestamp('sent_at'),
        sentToEmail: text('sent_to_email'),
        linkOpenedAt: timestamp('link_opened_at'),
        claimedAt: timestamp('claimed_at'),
        claimedWorkspaceId: text('claimed_workspace_id').references(() => workspace.id, { onDelete: 'set null' }),
        claimedByUserId: text('claimed_by_user_id').references(() => user.id, { onDelete: 'set null' }),
        revokedAt: timestamp('revoked_at'),
        createdAt: timestamp('created_at').notNull().defaultNow(),
    },
    (t) => [
        uniqueIndex('jawaf_claim_token_uq').on(t.tokenHash),
        index('jawaf_claim_bot_idx').on(t.botId, t.createdAt),
        index('jawaf_claim_created_idx').on(t.createdAt),
    ],
)
