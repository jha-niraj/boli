-- Admin Inbox + the richer Jawaf pilot form (plan/admin/jawaf/admin-v1.md, task 3).
-- contact_message.details: the topic's extra fields (Jawaf pilot: business name, website, type, city, phone).
-- handled_at / handled_by on contact_message and feedback: an admin marked it handled (NULL = still open).
-- Additive and idempotent - safe to run twice. On a FRESH database `ALLOW_DB_PUSH=1 pnpm db:push` creates these instead.

ALTER TABLE "contact_message" ADD COLUMN IF NOT EXISTS "details" jsonb;
ALTER TABLE "contact_message" ADD COLUMN IF NOT EXISTS "handled_at" timestamp;
ALTER TABLE "contact_message" ADD COLUMN IF NOT EXISTS "handled_by" text;
ALTER TABLE "feedback" ADD COLUMN IF NOT EXISTS "handled_at" timestamp;
ALTER TABLE "feedback" ADD COLUMN IF NOT EXISTS "handled_by" text;
