# AI - the layer and the AI page

> **Out of date for Boli (2026-11-24).** This describes the base's Claude-powered AI page. In Boli the chat is **Kura**
> (`/kura`) and runs only on our own open model `boli-chat` via llama-server (`packages/ai/src/boli.ts`,
> `apps/main/app/api/ai/chat/route.ts`); the public API is `/v1/*` (`apps/main/app/api/v1/[...path]/route.ts`).
> See `plan/main/platform/platform-v0.md` and `docs/inference/07-api-keys-and-gateway.md`. Rewrite this file after v0.


Rules (cost, the page, cards): [`AGENTS.md` section 12](../AGENTS.md#12-ai). This file maps them to code.

## `@repo/ai` (`packages/ai/src/`)

Server entry `@repo/ai`; client code imports only `@repo/ai/protocol` (and `@repo/ai/models` for labels). The package
re-exports `tool`, `modelMessageSchema`, `ToolSet`, `ModelMessage` from `ai` so apps depend on one `ai` copy.

| File | What it holds |
|---|---|
| `config.ts` | `AI_TASKS` - THE task -> model map (`model`, `effort`, `maxOutputTokens`, `label`). Example tasks: `chat`, `summary`, `classify` on `claude-haiku-5-5` (effort `low`); `heavy_extract` on `claude-sonnet-5-5` (effort `medium`). `taskConfig(task)`. Call sites name a task, never a model id. |
| `models.ts` | `MODELS` - prices in USD per million tokens (`input`, `output`, `cacheRead`, `cacheWrite5m`, `cacheWrite1h`, optional `longContext` card above 100K prompt tokens for Haiku). `getModel(id)`. Checked 2026-11-23 per the file comment. |
| `anthropic.ts` | `thinkingFor()` returns `{ type: 'adaptive' }` for every task (the same on every turn - switching invalidates the cache; comments record how to turn it off per model). `anthropicOptionsFor(task)` = thinking + the task's effort. `getChatModel(task)`, `aiConfigured()` (ANTHROPIC_API_KEY set). A fetch wrapper drops `$schema` from tool schemas and, in development, logs `[ai cache] request` with fingerprints of tools / system, message count, thinking and effort. |
| `cache.ts` | `cachedInstructions(text)` - the system prompt marked `{ type: 'ephemeral', ttl: '1h' }` (caches tools + system for everyone). `withCacheMarks(messages)` - clears message-level marks, then marks the last user message and the latest tool result after it with the 5-minute mark (idempotent, run before every step). `turnContextMessage(text)` - the per-turn system block placed after the user message. |
| `agent.ts` | `runChatTurn(opts, emit)` - `streamText` with `instructions: cachedInstructions(...)`, `allowSystemInMessages: true`, `toolOrder` + `activeTools` (only listed tools are sent, in a fixed order), `stopWhen: [isStepCount(maxSteps ?? 6), hasToolCall(...stopOnTools)]`, `maxRetries: 1`, `prepareStep` re-marks the cache and drops tools in `outages`. Streams `text`, `reasoning` / `reasoning-end` (one `thought` part kept FIRST with its total ms), `tool` (call / done / error with timestamps, only for tools with a label), `card` (from a tool's `_card`), `link` (from `_links`, paths starting `/` only, max 8), `notice` (from `_outage`). A tool returning `_outage` or throwing is removed for the rest of the turn. Records usage on every path (also failures) via `recordAiUsage`. Dev log: `[ai cache] step N { input, uncached, read, write, write1h, output, hit, finish }`. `asCard(v, id)` validates cards (questions max 5, options max 8, confirm items max 5, form fields max 8). |
| `protocol.ts` | Client-safe. Cards `ChatQuestionCard` / `ChatConfirmCard` / `ChatFormCard`, `CardState` (`open answered confirmed cancelled submitted`), `ChatLink`, stored `MessagePart` (`text`, `thought`, `tool`, `card`, `link`, `notice`), frames `ChatFrame` (`meta text reasoning reasoning-end tool card link notice error done`), `encodeFrame`, `readFrameStream` (NDJSON), `CardReply` (`answerTo`, `decision`, `content` for the model, `display` for the bubble). |
| `errors.ts` | `classifyAiError` -> `ChatErrorCode` (`cap overloaded rate_limit quota auth invalid not_configured unknown`) with a plain sentence each (`aiErrorMessage`). 529 / "overloaded" / 5xx -> overloaded; 402 or "credit balance" -> quota. |
| `usage.ts` | The package owns no table: `setAiUsageSink(fn)`; `recordAiUsage(record)` is awaited and never throws (warns when no sink). `AiRequestUsage` per request: `inputTokens`, `cacheReadTokens`, `cacheWriteTokens`, `cacheWrite1hTokens` (from raw `cache_creation.ephemeral_1h_input_tokens`), `outputTokens`. |

## `@repo/billing` - meter, log, cap

- `ai-meter.ts`: `requestCostUsd(modelId, request)` = plain input x input + reads x cacheRead + 5-minute writes x
  cacheWrite5m + 1-hour writes x cacheWrite1h + output x output (reads and writes are subsets of input; long context
  chosen per request). Unknown model = 0 with `priceKnown: false`. `priceCall(modelId, requests)` totals and returns
  `microUsd` rounded up.
- `usage-log.ts`: `logAiUsage(db, record)` writes one `ai_usage_log` row; `spentTodayMicroUsd`, `startOfUtcDay`;
  `dailyCapMicroUsd()` from `AI_DAILY_USD_CAP_PER_USER` (blank = off); `checkDailyCap(db, userId)`.
- The app registers the sink once per isolate: `apps/main/lib/ai/usage-sink.ts`
  (`setAiUsageSink((r) => logAiUsage(db, r))`), imported for its side effect by `app/api/ai/chat/route.ts`. Any other
  server file that calls the AI must import it too.
- Credits (`hasCredits`, `spendCredits`, `creditsEnforced` via `CREDITS_ENFORCED=1`) are the payments work - see
  [`payments.md`](payments.md).

## One turn: `POST /api/ai/chat` (`apps/main/app/api/ai/chat/route.ts`)

Inline, the person waits. Order:
1. `getSession()` (401), zod body `{ conversationId?, message, display?, answerTo?, decision? }` (400),
   `aiConfigured()` (503), `checkDailyCap` (402 `cap`), `hasCredits` (402 `credits` with `href` + `actionLabel`).
2. The conversation is loaded only if it is this person's (404). A card answer must match an OPEN card on the latest
   assistant message (409 otherwise); its state and answer are written into that message's `parts`.
3. `turnContext({ name, role })` (`lib/ai/context.ts`: person, today UTC, page) is stored on the user row (`context`) so
   later turns replay it unchanged; a new chat inserts conversation + user message in one `db.batch`.
4. Messages = `buildHistory(rows)` (`lib/ai/conversations.ts`: last rows, user messages followed by their stored context,
   assistant turns from `model_messages` byte for byte; drops a context block whose turn has no reply) + this user
   message + the context block.
5. `runChatTurn({ task: 'chat', instructions: AI_SYSTEM_PROMPT, tools: buildTools({ userId, role }), toolOrder,
   stopOnTools: CARD_TOOLS, toolLabels: TOOL_LABELS, maxSteps: 6, abortSignal: req.signal, usage })`.
6. Credits spent inline when enforced; the assistant row (`content`, `parts`, `model_messages`) + `updatedAt` written in a
   batch before `done`. A failed save emits a `notice`.

## The AI page (`apps/main`)

| Piece | File | Role |
|---|---|---|
| Server half | `app/(main)/ai/_components/ai-route.tsx` | Session, the conversation (if `/ai/<id>`), History and Needs you started as promises |
| Page | `components/ai/ai-page.tsx` | `Page bleed body="fill"`; chat column (header, `ChatFrame` rails, `ChatWelcome` or transcript, `ChatComposer`) + `SideColumn` from lg; below lg History / Needs you / peeks open in Sheets and cards show inline. Cmd/Ctrl+J focuses the composer. Column open state in `localStorage` (`app.ai.column-open`) |
| Send path | `components/ai/use-chat.ts` | THE one `send` for typed messages, welcome cards, Ask rows and card presses; reads frames with `readFrameStream`; coalesces token frames per animation frame; writes `/ai/<id>` with `history.replaceState`; 401 -> `/signin?stale=1`, 404 -> new chat + one resend, 409 -> "already decided", 402 -> note + button |
| State | `stores/ai-chat.store.ts` (`useAiChat`) | Messages, status, note + action, form values per card id |
| Right column | `components/ai/side-column.tsx` (`SideColumn`) | One thing at a time: a card layer, else a peek layer, else tabs Needs you / History. Width clamp(300, viewport - 1024, 560), draggable 300-640, stored in `localStorage` `app.ai.column-width`, double-click resets |
| Cards | `components/ai/task-cards.tsx` | `TaskCard` (question set stepped one at a time, confirm, form), `TaskPointer` (the one-line pointer in the chat), `CardRecord` (decided / stale). Each press calls `onReply` with `content` (tells the model exactly what to do, e.g. "call the write tool with confirmed=true") and `display` |
| Messages | `components/ai/chat-message.tsx` | Markdown (links the model types render as plain text), thought, tool lines, cards, structured links (`/peek/...` opens a peek) |
| Welcome | `components/ai/chat-welcome.tsx`, `welcome-config.ts` | `CREATE_CARDS` (prompt / seed / tab, gated by `adminOnly`, `needsWeb`, max 6), `ASK_ROWS` (max 4) - example data |
| History | `components/ai/history-panel.tsx` | Today / Previous 7 days / Older, search, rename in a popover, delete with `ConfirmPopover`; key `AI_HISTORY_KEY` |
| Needs you | `components/ai/needs-you.tsx` | Groups now / today / later; one free read (no model call); a failed source says so with Try again; key `AI_NEEDS_YOU_KEY` |
| Keys, measure | `components/ai/query-keys.ts` | `AI_HISTORY_KEY`, `AI_NEEDS_YOU_KEY`, `aiPeekKey`, `READING_MEASURE` (`max-w-4xl`), `CHAT_COLUMN`, `CHAT_COLUMN_STYLE` (`--app-col-h`) |
| Actions | `actions/ai/ai.action.ts` | `listConversations`, `getConversation`, `renameConversation`, `deleteConversation`, `getNeedsYou`, `getUserPeek` - each checks the session |
| Skeleton | `components/ai/ai-skeleton.tsx` | `AiPageSkeleton` (loading.tsx), `TranscriptSkeleton`, `ComposerSkeleton` |

### Peeks (quick looks beside the chat)

An address `/peek/<kind>/<id>`, not a route (`next.config.js` redirects a typed one to `/ai?peek=<kind>/<id>`).
- `lib/peeks/peek-routes.ts`: `PEEK_KINDS = ['user']`, `parsePeekHref`, `isPeekHref`, `userPeekHref`, `PEEK_PARAM`.
- `components/peeks/peek-view.tsx`: `REGISTRY` kind -> `{ title, Body, Skeleton }`; `PeekBody`; a `/peek/` link inside a
  peek stacks the next one (`stores/peek.store.ts`, stack capped at 8, Back pops).
- `components/peeks/bodies/user-peek.tsx`: the example body - reads `getUserPeek(id)` through `cachedRead` (`later.ts`:
  promise cache by key, 30s TTL, started on a microtask) and `use()`; draws `PeekShell` (`peek-shell.tsx`).
- `peek-context.tsx`: `usePeekActions().ask(prompt)` hands a prompt to the chat's one send path.

**Add a peek kind**: add the kind to `PEEK_KINDS` + an href builder in `peek-routes.ts`; a server read filtered by the
viewer (pattern: `userPeekFor` in `lib/ai/conversations.ts`) and a `'use server'` action that checks the session
(pattern: `getUserPeek`); a body + skeleton in `components/peeks/bodies/` using `PeekShell`; a `REGISTRY` entry; tools
return links to it in `_links`.

### Needs you

`needsYouFor(viewer)` in `lib/ai/conversations.ts` returns `{ items: NeedsYouItem[], failed: string[] }`. Example
sources: "Verify your email" for the viewer, and for `role === 'ADMIN'` people unverified for over a day (limit 20).

**Add a source**: inside `needsYouFor`, one `try` block per source that pushes `{ id, group: 'now' | 'today' | 'later',
title, detail, href }` (href usually a peek or a route constant) and on failure pushes a plain description to `failed`.
Keep it one cheap read, filtered by the viewer.

## Add a tool (`apps/main/lib/ai/tools.ts`)

1. Add it inside `buildTools(ctx)` with `tool({ description, inputSchema: z.object(...), execute })`. Description and
   schema are FIXED text - no names, dates or ids (the tools sit at the start of the cached prefix). Who is asking comes
   from the closure (`ctx.userId`, `ctx.role`); re-check what that person may see.
2. Return data for the model; optional `_links: [{ label, href }]` (route constants or peek hrefs - never a guessed URL),
   `_card` (a card), `_outage: '<one line>'` when the service behind it is down.
3. Add its name to `toolOrder()` (fixed order; a tool that only applies on some pages stays in and answers "nothing
   open"). A deployment-wide switch (like `webSearchEnabled()` on `EXA_API_KEY`) is fine; a per-request switch is not.
4. Add an activity line to `TOOL_LABELS` (card tools have none); a tool that shows a card goes in `CARD_TOOLS` (ends the
   turn).
5. A write takes `confirmed: boolean` and refuses without it; it counts writes per turn and creates at most five
   (`writesThisTurn` in `saveNote`). Pressing a card SENDS A MESSAGE; the write runs here, behind the guard.
6. A screen-only capability: one line plus a link built from `ROUTES` (redirect, never dead-end). Chat is for decisions
   and lookups, not data entry.
7. Update the "What you can do" part of `lib/ai/system-prompt.ts` (frozen text) and, if useful, `welcome-config.ts`.

## Verify caching

Run `pnpm --filter main dev`, send two messages in one chat, and read the server console:
- `[ai cache] request { model, tools: <hash>/<len>, system: <hash>/<len>, messages, thinking, effort }` per request.
- `[ai cache] step N { input, uncached, read, write, write1h, output, hit }` per step.
From the second request on `read` must be > 0. If not, compare two consecutive `request` lines: the fingerprint that
changed (tools, system, thinking, effort) is the invalidator. The 1-hour start shows as `write1h` on the first request.
Per-call cost lands in `ai_usage_log` and on `/settings/usage`.

## Move a task to another model

1. Edit the task's `model` (and `effort`) in `packages/ai/src/config.ts` - nowhere else names a model.
2. The model must exist in `MODELS` (`packages/ai/src/models.ts`) with current rates, or the meter logs cost 0 with
   `price_known = false`.
3. Thinking: `thinkingFor()` is adaptive for all; read its comment before changing it (Sonnet's lowest is
   `between_tools`, Opus cannot turn it off). Keep it identical across turns of a conversation.
4. Look at the task's output on real inputs before and after (AGENTS.md section 12), and check the cache log again.
