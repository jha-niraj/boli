-- Jawaf in admin (plan/admin/jawaf/admin-v1.md task 2): bot pause columns, the demo tracker (jawaf_prospect) and the
-- one-time claim links (jawaf_claim). Mirrors packages/db/src/schema/jawaf.ts. Limit overrides already exist
-- (jawaf_bot.limits jsonb, scripts/jawaf.sql). Additive and idempotent - safe to run twice:
--   pnpm --filter @repo/db sql scripts/jawaf-admin.sql            (preview)
--   pnpm --filter @repo/db sql scripts/jawaf-admin.sql --apply    (run; then run it again)

ALTER TABLE "jawaf_bot" ADD COLUMN IF NOT EXISTS "paused" boolean NOT NULL DEFAULT false;
ALTER TABLE "jawaf_bot" ADD COLUMN IF NOT EXISTS "paused_reason" text;
ALTER TABLE "jawaf_bot" ADD COLUMN IF NOT EXISTS "paused_at" timestamp;

CREATE TABLE IF NOT EXISTS "jawaf_prospect" (
    "id" text PRIMARY KEY,
    "business" text NOT NULL,
    "website" text,
    "business_type" text NOT NULL DEFAULT 'other',
    "sector" text,
    "city" text,
    "contact_name" text,
    "phone" text,
    "email" text,
    "stage" text NOT NULL DEFAULT 'sent',
    "next_step_at" timestamp,
    "notes" text NOT NULL DEFAULT '',
    "owner_user_id" text REFERENCES "user"("id") ON DELETE SET NULL,
    "bot_id" text REFERENCES "jawaf_bot"("id") ON DELETE SET NULL,
    "source_contact_message_id" text,
    "created_by_id" text REFERENCES "user"("id") ON DELETE SET NULL,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "jawaf_prospect_stage_idx" ON "jawaf_prospect" ("stage", "next_step_at");
CREATE INDEX IF NOT EXISTS "jawaf_prospect_bot_idx" ON "jawaf_prospect" ("bot_id");
CREATE INDEX IF NOT EXISTS "jawaf_prospect_created_idx" ON "jawaf_prospect" ("created_at");

CREATE TABLE IF NOT EXISTS "jawaf_claim" (
    "id" text PRIMARY KEY,
    "bot_id" text NOT NULL REFERENCES "jawaf_bot"("id") ON DELETE CASCADE,
    "prospect_id" text REFERENCES "jawaf_prospect"("id") ON DELETE SET NULL,
    "token_hash" text NOT NULL,
    "created_by_admin_id" text REFERENCES "admin_access"("id") ON DELETE SET NULL,
    "expires_at" timestamp NOT NULL,
    "sent_at" timestamp,
    "sent_to_email" text,
    "link_opened_at" timestamp,
    "claimed_at" timestamp,
    "claimed_workspace_id" text REFERENCES "workspace"("id") ON DELETE SET NULL,
    "claimed_by_user_id" text REFERENCES "user"("id") ON DELETE SET NULL,
    "revoked_at" timestamp,
    "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "jawaf_claim_token_uq" ON "jawaf_claim" ("token_hash");
CREATE INDEX IF NOT EXISTS "jawaf_claim_bot_idx" ON "jawaf_claim" ("bot_id", "created_at");
CREATE INDEX IF NOT EXISTS "jawaf_claim_created_idx" ON "jawaf_claim" ("created_at");
