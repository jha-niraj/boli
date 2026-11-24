-- Kura like / dislike (plan/main/kura/kura-message-actions.md): a rating on an assistant message.
-- rating: 1 = helpful, -1 = not helpful, NULL = not rated. rating_reason: the optional "what went wrong" choice.
-- Additive and idempotent - safe to run twice. On a FRESH database `ALLOW_DB_PUSH=1 pnpm db:push` creates these instead.

ALTER TABLE "ai_message" ADD COLUMN IF NOT EXISTS "rating" smallint;
ALTER TABLE "ai_message" ADD COLUMN IF NOT EXISTS "rating_reason" text;
ALTER TABLE "ai_message" ADD COLUMN IF NOT EXISTS "rated_at" timestamp;
