-- Workspaces (plan/main/jawaf/jawaf-v1.md, Wave 1 task 1): workspace, workspace_member, workspace_invitation, and a
-- nullable workspace_id on api_key, inference_request and ai_conversation. Matches packages/db/src/schema/workspace.ts.
-- Additive and idempotent - safe to run twice. On a FRESH database `ALLOW_DB_PUSH=1 pnpm db:push` creates these instead.
-- Existing rows are moved by scripts/backfill-workspaces.mjs (preview by default, --apply to write).

CREATE TABLE IF NOT EXISTS "workspace" (
    "id" text PRIMARY KEY NOT NULL,
    "name" text NOT NULL,
    "personal_owner_id" text REFERENCES "user"("id") ON DELETE CASCADE,
    "created_by_id" text REFERENCES "user"("id") ON DELETE SET NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "workspace_personal_owner_uq" ON "workspace" ("personal_owner_id");

CREATE TABLE IF NOT EXISTS "workspace_member" (
    "id" text PRIMARY KEY NOT NULL,
    "workspace_id" text NOT NULL REFERENCES "workspace"("id") ON DELETE CASCADE,
    "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "role" text DEFAULT 'member' NOT NULL,
    "access" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "invited_by_id" text REFERENCES "user"("id") ON DELETE SET NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "workspace_member_ws_user_uq" ON "workspace_member" ("workspace_id", "user_id");
CREATE INDEX IF NOT EXISTS "workspace_member_user_idx" ON "workspace_member" ("user_id");

CREATE TABLE IF NOT EXISTS "workspace_invitation" (
    "id" text PRIMARY KEY NOT NULL,
    "workspace_id" text NOT NULL REFERENCES "workspace"("id") ON DELETE CASCADE,
    "email" text NOT NULL,
    "token_hash" text NOT NULL,
    "access" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "status" text DEFAULT 'pending' NOT NULL,
    "invited_by_id" text REFERENCES "user"("id") ON DELETE SET NULL,
    "accepted_by_id" text REFERENCES "user"("id") ON DELETE SET NULL,
    "accepted_at" timestamp,
    "expires_at" timestamp NOT NULL,
    "sent_count" integer DEFAULT 1 NOT NULL,
    "last_sent_at" timestamp DEFAULT now() NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "workspace_invitation_token_uq" ON "workspace_invitation" ("token_hash");
CREATE UNIQUE INDEX IF NOT EXISTS "workspace_invitation_pending_uq" ON "workspace_invitation" ("workspace_id", "email") WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS "workspace_invitation_ws_status_idx" ON "workspace_invitation" ("workspace_id", "status");

ALTER TABLE "api_key" ADD COLUMN IF NOT EXISTS "workspace_id" text REFERENCES "workspace"("id") ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS "api_key_workspace_created_idx" ON "api_key" ("workspace_id", "created_at");

ALTER TABLE "inference_request" ADD COLUMN IF NOT EXISTS "workspace_id" text REFERENCES "workspace"("id") ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS "inference_request_workspace_created_idx" ON "inference_request" ("workspace_id", "created_at");

ALTER TABLE "ai_conversation" ADD COLUMN IF NOT EXISTS "workspace_id" text REFERENCES "workspace"("id") ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS "ai_conversation_ws_user_updated_idx" ON "ai_conversation" ("workspace_id", "user_id", "updated_at");
