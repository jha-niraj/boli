-- Jawaf (plan/main/jawaf/jawaf-v1.md tasks 4-6): bots, sources, pages, facts, Q&A, notes, chunks (pgvector), jobs,
-- conversations, messages, contacts, monthly answer usage. Mirrors packages/db/src/schema/jawaf.ts.
-- Additive and idempotent - safe to run twice:
--   pnpm --filter @repo/db sql scripts/jawaf.sql            (preview)
--   pnpm --filter @repo/db sql scripts/jawaf.sql --apply    (run; then run it again)

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS "jawaf_bot" (
    "id" text PRIMARY KEY,
    "workspace_id" text NOT NULL REFERENCES "workspace"("id") ON DELETE CASCADE,
    "name" text NOT NULL,
    "slug" text NOT NULL,
    "business_type" text NOT NULL DEFAULT 'other',
    "website" text,
    "tone" text NOT NULL DEFAULT 'friendly',
    "length" text NOT NULL DEFAULT 'balanced',
    "instructions" text NOT NULL DEFAULT '',
    "greeting" text NOT NULL DEFAULT '',
    "suggested_questions" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "contact_fields" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "look" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "published_look" jsonb,
    "show_sources" boolean NOT NULL DEFAULT true,
    "branding_removed" boolean NOT NULL DEFAULT false,
    "demo" boolean NOT NULL DEFAULT false,
    "claim_code_hash" text,
    "claim_expires_at" timestamp,
    "training_opt_in" boolean NOT NULL DEFAULT false,
    "status" text NOT NULL DEFAULT 'draft',
    "setup_step" text NOT NULL DEFAULT 'business',
    "limits" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "free_pages_used" integer NOT NULL DEFAULT 0,
    "created_by_id" text REFERENCES "user"("id") ON DELETE SET NULL,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "jawaf_bot_slug_uq" ON "jawaf_bot" ("slug");
CREATE INDEX IF NOT EXISTS "jawaf_bot_ws_idx" ON "jawaf_bot" ("workspace_id", "created_at");

CREATE TABLE IF NOT EXISTS "jawaf_source" (
    "id" text PRIMARY KEY,
    "workspace_id" text NOT NULL REFERENCES "workspace"("id") ON DELETE CASCADE,
    "bot_id" text NOT NULL REFERENCES "jawaf_bot"("id") ON DELETE CASCADE,
    "kind" text NOT NULL,
    "url" text,
    "file_key" text,
    "file_name" text,
    "file_size" integer,
    "mime_type" text,
    "file_pages" integer,
    "status" text NOT NULL DEFAULT 'queued',
    "error" text,
    "pages_found" integer NOT NULL DEFAULT 0,
    "last_read_at" timestamp,
    "next_read_at" timestamp,
    "created_by_id" text REFERENCES "user"("id") ON DELETE SET NULL,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "jawaf_source_bot_idx" ON "jawaf_source" ("bot_id", "kind");
CREATE INDEX IF NOT EXISTS "jawaf_source_next_read_idx" ON "jawaf_source" ("next_read_at");

CREATE TABLE IF NOT EXISTS "jawaf_page" (
    "id" text PRIMARY KEY,
    "workspace_id" text NOT NULL REFERENCES "workspace"("id") ON DELETE CASCADE,
    "bot_id" text NOT NULL REFERENCES "jawaf_bot"("id") ON DELETE CASCADE,
    "source_id" text NOT NULL REFERENCES "jawaf_source"("id") ON DELETE CASCADE,
    "url" text,
    "url_key" text,
    "title" text,
    "markdown" text,
    "content_hash" text,
    "status" text NOT NULL DEFAULT 'included',
    "read_status" text NOT NULL DEFAULT 'pending',
    "change" text,
    "suggested" boolean NOT NULL DEFAULT false,
    "rank" integer NOT NULL DEFAULT 0,
    "chars" integer NOT NULL DEFAULT 0,
    "error" text,
    "billed" text,
    "disagrees_with_facts" boolean NOT NULL DEFAULT false,
    "last_read_at" timestamp,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "jawaf_page_bot_url_uq" ON "jawaf_page" ("bot_id", "url_key");
CREATE INDEX IF NOT EXISTS "jawaf_page_bot_status_idx" ON "jawaf_page" ("bot_id", "status", "read_status");
CREATE INDEX IF NOT EXISTS "jawaf_page_source_idx" ON "jawaf_page" ("source_id");

CREATE TABLE IF NOT EXISTS "jawaf_fact_section" (
    "id" text PRIMARY KEY,
    "workspace_id" text NOT NULL REFERENCES "workspace"("id") ON DELETE CASCADE,
    "bot_id" text NOT NULL REFERENCES "jawaf_bot"("id") ON DELETE CASCADE,
    "key" text NOT NULL,
    "title" text NOT NULL,
    "html" text NOT NULL DEFAULT '',
    "text" text NOT NULL DEFAULT '',
    "table" jsonb,
    "approved" boolean NOT NULL DEFAULT false,
    "drafted" boolean NOT NULL DEFAULT false,
    "sort" integer NOT NULL DEFAULT 0,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "jawaf_fact_bot_idx" ON "jawaf_fact_section" ("bot_id", "sort");

CREATE TABLE IF NOT EXISTS "jawaf_qa" (
    "id" text PRIMARY KEY,
    "workspace_id" text NOT NULL REFERENCES "workspace"("id") ON DELETE CASCADE,
    "bot_id" text NOT NULL REFERENCES "jawaf_bot"("id") ON DELETE CASCADE,
    "question" text NOT NULL,
    "phrasings" text[] NOT NULL DEFAULT '{}'::text[],
    "answer" text NOT NULL,
    "source" text NOT NULL DEFAULT 'owner',
    "approved" boolean NOT NULL DEFAULT true,
    "source_message_id" text,
    "created_by_id" text REFERENCES "user"("id") ON DELETE SET NULL,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "jawaf_qa_bot_idx" ON "jawaf_qa" ("bot_id", "created_at");

CREATE TABLE IF NOT EXISTS "jawaf_note" (
    "id" text PRIMARY KEY,
    "workspace_id" text NOT NULL REFERENCES "workspace"("id") ON DELETE CASCADE,
    "bot_id" text NOT NULL REFERENCES "jawaf_bot"("id") ON DELETE CASCADE,
    "kind" text NOT NULL DEFAULT 'note',
    "title" text NOT NULL,
    "html" text NOT NULL DEFAULT '',
    "text" text NOT NULL DEFAULT '',
    "table" jsonb,
    "created_by_id" text REFERENCES "user"("id") ON DELETE SET NULL,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "jawaf_note_bot_idx" ON "jawaf_note" ("bot_id", "updated_at");

CREATE TABLE IF NOT EXISTS "jawaf_chunk" (
    "id" text PRIMARY KEY,
    "workspace_id" text NOT NULL REFERENCES "workspace"("id") ON DELETE CASCADE,
    "bot_id" text NOT NULL REFERENCES "jawaf_bot"("id") ON DELETE CASCADE,
    "origin_kind" text NOT NULL,
    "origin_id" text NOT NULL,
    "source_id" text,
    "heading" text NOT NULL DEFAULT '',
    "text" text NOT NULL,
    "seq" integer NOT NULL DEFAULT 0,
    "tokens" integer NOT NULL DEFAULT 0,
    "embedding" vector(1024),
    "tsv" tsvector GENERATED ALWAYS AS (to_tsvector('simple', coalesce("heading", '') || ' ' || "text")) STORED,
    "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "jawaf_chunk_bot_origin_idx" ON "jawaf_chunk" ("bot_id", "origin_kind", "origin_id");
CREATE INDEX IF NOT EXISTS "jawaf_chunk_source_idx" ON "jawaf_chunk" ("source_id");
CREATE INDEX IF NOT EXISTS "jawaf_chunk_embedding_hnsw" ON "jawaf_chunk" USING hnsw ("embedding" vector_cosine_ops);
CREATE INDEX IF NOT EXISTS "jawaf_chunk_tsv_gin" ON "jawaf_chunk" USING gin ("tsv");
CREATE INDEX IF NOT EXISTS "jawaf_chunk_text_trgm" ON "jawaf_chunk" USING gin ("text" gin_trgm_ops);

CREATE TABLE IF NOT EXISTS "jawaf_job" (
    "id" text PRIMARY KEY,
    "workspace_id" text NOT NULL REFERENCES "workspace"("id") ON DELETE CASCADE,
    "bot_id" text NOT NULL REFERENCES "jawaf_bot"("id") ON DELETE CASCADE,
    "kind" text NOT NULL,
    "status" text NOT NULL DEFAULT 'queued',
    "progress" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "cursor" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "source_id" text,
    "error" text,
    "error_code" text,
    "lease_until" timestamp,
    "slices" integer NOT NULL DEFAULT 0,
    "created_by_id" text REFERENCES "user"("id") ON DELETE SET NULL,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "started_at" timestamp,
    "finished_at" timestamp,
    "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "jawaf_job_active_uq" ON "jawaf_job" ("bot_id", "kind", coalesce("source_id", '')) WHERE status in ('queued', 'running');
CREATE INDEX IF NOT EXISTS "jawaf_job_status_idx" ON "jawaf_job" ("status", "lease_until");
CREATE INDEX IF NOT EXISTS "jawaf_job_bot_idx" ON "jawaf_job" ("bot_id", "created_at");

CREATE TABLE IF NOT EXISTS "jawaf_conversation" (
    "id" text PRIMARY KEY,
    "workspace_id" text NOT NULL REFERENCES "workspace"("id") ON DELETE CASCADE,
    "bot_id" text NOT NULL REFERENCES "jawaf_bot"("id") ON DELETE CASCADE,
    "visitor_id" text,
    "user_id" text REFERENCES "user"("id") ON DELETE SET NULL,
    "channel" text NOT NULL,
    "page_url" text,
    "script" text,
    "contact_captured" boolean NOT NULL DEFAULT false,
    "message_count" integer NOT NULL DEFAULT 0,
    "started_at" timestamp NOT NULL DEFAULT now(),
    "last_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "jawaf_conversation_bot_last_idx" ON "jawaf_conversation" ("bot_id", "last_at");
CREATE INDEX IF NOT EXISTS "jawaf_conversation_visitor_idx" ON "jawaf_conversation" ("bot_id", "visitor_id");

CREATE TABLE IF NOT EXISTS "jawaf_message" (
    "id" text PRIMARY KEY,
    "workspace_id" text NOT NULL REFERENCES "workspace"("id") ON DELETE CASCADE,
    "bot_id" text NOT NULL REFERENCES "jawaf_bot"("id") ON DELETE CASCADE,
    "conversation_id" text NOT NULL REFERENCES "jawaf_conversation"("id") ON DELETE CASCADE,
    "role" text NOT NULL,
    "text" text NOT NULL DEFAULT '',
    "sources" jsonb,
    "answered" boolean,
    "status" text,
    "script" text,
    "rating" smallint,
    "rating_reason" text,
    "latency_ms" integer,
    "input_tokens" integer NOT NULL DEFAULT 0,
    "output_tokens" integer NOT NULL DEFAULT 0,
    "cost_micro" bigint NOT NULL DEFAULT 0,
    "retrieval" jsonb,
    "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "jawaf_message_conv_idx" ON "jawaf_message" ("conversation_id", "created_at");
CREATE INDEX IF NOT EXISTS "jawaf_message_bot_answered_idx" ON "jawaf_message" ("bot_id", "answered", "created_at");

CREATE TABLE IF NOT EXISTS "jawaf_contact" (
    "id" text PRIMARY KEY,
    "workspace_id" text NOT NULL REFERENCES "workspace"("id") ON DELETE CASCADE,
    "bot_id" text NOT NULL REFERENCES "jawaf_bot"("id") ON DELETE CASCADE,
    "conversation_id" text REFERENCES "jawaf_conversation"("id") ON DELETE SET NULL,
    "fields" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "status" text NOT NULL DEFAULT 'new',
    "notes" text NOT NULL DEFAULT '',
    "follow_up_at" timestamp,
    "summary" text,
    "intent" text,
    "channel" text NOT NULL,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "jawaf_contact_bot_idx" ON "jawaf_contact" ("bot_id", "created_at");
CREATE INDEX IF NOT EXISTS "jawaf_contact_bot_status_idx" ON "jawaf_contact" ("bot_id", "status");

CREATE TABLE IF NOT EXISTS "jawaf_usage_month" (
    "id" text PRIMARY KEY,
    "workspace_id" text NOT NULL REFERENCES "workspace"("id") ON DELETE CASCADE,
    "month" text NOT NULL,
    "answers" integer NOT NULL DEFAULT 0,
    "charged_micro" bigint NOT NULL DEFAULT 0,
    "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "jawaf_usage_month_ws_uq" ON "jawaf_usage_month" ("workspace_id", "month");
