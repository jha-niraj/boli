# Kura: icon-only panel toggle, thinking steps, copy and like / dislike

| | |
|---|---|
| **App / module** | `main/kura` |
| **Status** | Done (awaiting review) |
| **Opened** | 2026-11-24 |
| **Last updated** | 2026-11-24 |
| **Files** | `packages/ui/src/components/ui/page.tsx`, `apps/main/components/kura/{kura-page,chat-message,message-actions}.tsx`, `apps/main/actions/ai/kura.action.ts`, `apps/main/lib/ai/{types,conversations}.ts`, `apps/main/stores/kura-chat.store.ts`, `packages/db/src/schema/ai.ts`, `packages/db/scripts/kura-message-rating.sql` |

## What was asked

During the end-to-end Kura check (owner, 2026-11-24): "put this [Hide side panel] beside the New Chat as icon only at
the end", "add the thinking and reasoning UI steps", "copy and like dislike button as well".

## What "done" looks like

- The header reads History, New chat, then the panel toggle as an icon-only button at the far right, with its label in
  a tooltip and for screen readers.
- With Think on, a reply shows the folded "Thinking..." row live while the model thinks, and "Thought for Ns" after;
  it opens to the model's own thinking. Saved chats show it again after a refresh.
- Under every finished reply: Copy (copies the reply text, the icon turns into a check), thumbs up, thumbs down.
  Thumbs down opens a small popover asking what went wrong (optional reason). The choice is saved on the message and
  shows again after a refresh; pressing the same thumb again clears it.

## Decisions (no question had more than one sensible answer)

- The rating lives on `ai_message` (`rating` -1/1, `rating_reason`, `rated_at`), not the general `feedback` table: it
  belongs to one reply, loads with the chat, and goes when the chat is deleted. Added by an additive SQL script.

---

## Tasks

- [x] **1. Icon-only page action** - `iconOnly` on `PageAction`; Kura's toggle moves to the end.
  - Verified: Chrome :3100/kura - header reads History, New chat, then the panel icon at the far right; find() names it "Hide side panel".
- [x] **2. Rating column + action** - SQL script (run twice on the staging DB), schema, `rateMessage` action.
  - Verified: `pnpm --filter @repo/db sql scripts/kura-message-rating.sql --apply` twice on ep-cold-violet (staging) - 3 statements ran both times, no error.
- [x] **3. Message actions row** - Copy, thumbs up / down with reason popover, loads saved rating.
  - Verified: Chrome - thumbs down opened "What went wrong?", picked "Not true"; thumbs up on another reply; after a reload both showed (filled thumbs, "Not true" label). Copy turned into a check; pbpaste printed the reply text.
- [x] **4. Thinking steps checked live with Think on** - fix anything that does not show.
  - Fixed: the shared ReasoningSteps showed the thought as raw markdown ("**User Input Analysis:**") and stayed open. New `kura-thinking.tsx` splits Gemma's headed sections into a step timeline, renders markdown, folds when the reply arrives.
  - Verified: splitThought test (numbered, bulleted, nested) printed the right steps; Chrome - two Think turns folded to "Thought for 10s - 4 steps" / "Thought for 12s - 5 steps", opening showed titled steps with ticks and clean lists.
- [x] **5. Typecheck + Chrome pass**
  - Verified: `tsc --noEmit` main and web - no errors. Chrome pass above.

- [x] **6. Code blocks bounded (owner, mid-task)** - CodeTabs / CodeBody default to a ceiling (`CODE_CEILING`, max-h 26rem) and scroll inside their ScrollArea; Kura's Code tab uses a fixed `h-[24rem]`.
  - Verified: Chrome :3102/docs/chatcompletions - long blocks 442px tall with 468-570px of content scrolling inside; short ones unchanged. Kura Code tab fixed height, scrolls inside.
