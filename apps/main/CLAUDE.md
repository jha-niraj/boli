# apps/main - Boli, the product

Boli: open AI for Nepal. People sign up, get 100 free credits, chat with our own open model in **Kura** (`/kura`, where
they land after sign-in) and call an OpenAI-compatible API (`/v1/chat/completions`) with their own API keys. Public
pages: `/` (landing), `/about` (with contact), `/docs/*`, `/terms`, `/privacy`, the auth pages. Port 3100. The root
`AGENTS.md` holds the general rules; this file is what is specific to this app, and **where the two differ for Boli,
this file wins**. The build plan: `plan/main/platform/platform-v0.md`. The shared constants: `lib/boli.ts`.

## Boli rules (owner decisions, 2026-11-24)

- **Only our own open models.** Nothing in this app may call Claude, OpenAI or any closed model: Kura and the API run on
  `boli-chat` (llama-server, `LLAMA_BASE_URL`). Boli sells open inference; a closed model behind it would be a lie.
- **Names.** Product: Boli. Tagline: "Open AI for Nepal". The chat is **Kura** (कुरा, conversation) - in the UI, in
  routes (`/kura`) and in public copy, with the subtitle "Chat with Boli's model in Nepali, English or both". The model
  id is `boli-chat`, labelled "Gemma 4 E4B, 4-bit".
- **Credits.** 1 credit = Rs 1 (NPR). Stored in integer micro-credits (`balance_micro`, `amount_micro`, `cost_micro`);
  shown with 2 decimals via `formatCredits`. Prices, limits and copy come from `lib/boli.ts` - never a literal.
- **Fonts.** Instrument Serif for display headings (h1/h2 on public pages, big numbers), Inter for all UI and body
  text, Geist Mono for code. Loaded with `next/font/local` in `app/fonts.ts`.
- **Colour.** Warm off-white ground, near-black ink, one Nepal crimson accent used sparingly (primary buttons on public
  pages, the active rail item marker, key highlights), deep blue as a secondary for links and charts. Tokens live in
  `app/boli.css`; use the Tailwind classes it maps (`bg-background`, `text-foreground`, `text-boli-crimson`, ...),
  never hand-picked hex values in components.
- **Pills.** Buttons, inputs, select triggers and textareas are fully rounded in this app (overrides the base
  `rounded-xl` rule below; `app/boli.css` enforces it). Cards and sheets keep their normal radius.
- **Public pages** (landing, about, docs, legal, auth) are light-first and must read as a professional product: real
  typographic hierarchy, generous spacing, the pixel-Himalaya and line ornaments from `components/brand/`.
- **Dashboard** keeps light and dark.
- **API calls store metadata only** (no prompts or answers). Kura conversations are stored (they are the user's own).

## Layout

- `app/(main)/layout.tsx` is a SERVER layout: it reads the session (`getSession()` from `@/lib/session`, React-cached)
  and the rail cookie (`MAIN_RAIL_COOKIE`), then renders `MainShell` (`app/(main)/_components/main-shell.tsx`), which
  is the shared `AppShell` from `@repo/ui/components/shell/app-shell`. It never awaits page data.
- The rail lives in `lib/navigation.ts` (`MAIN_NAV`, `ROUTES`). To add a module: a folder under `app/(main)/`, a route
  constant, a rail item (`tab: true` to put it in the phone bottom bar). Profile is reached from the account row.
- Every page and every `'use server'` export checks the session itself; the layout's check is not enough.

### The shell does not pad. `Page` pads its own column.

`<main data-app-main>` takes the whole space beside the rail (owner, 2026-11-23: no frame of padding round the page) and
publishes `--app-page-h`, the exact height a bound page may take (on a phone it clears the 60px tab bar and the safe
area). `Page` puts its header and its content in one centred, padded column (`px-4`, 12px above the header) while its
scroll area spans the full box, so the scrollbar sits at the screen edge. A page root that adds `p-6` or `py-10`
doubles it.

- Default: `<Page>` content column is centred at `max-w-7xl`.
- `<Page width="reading">`: header and content in one max-w-3xl column (forms, Profile, settings sections).
- `<Page width="full">`: lifts the cap (a board, a split editor). Still padded.
- `<Page bleed>` (or `data-page-bleed` on any page root): takes the whole box - no padding, the full height, to the
  right edge - for a workspace that lays out its own columns. Kura uses it.

## Typography and density

| Element | Class |
|---|---|
| Page `<h1>` (only through `Page`) | `text-xl font-semibold` - never a responsive step-up |
| Page description | `text-xs`, one line, full text in a tooltip |
| Section heading / `CardTitle` / `SheetTitle` | `text-base font-semibold` |
| Header buttons | `size="sm"`, icons `h-3.5 w-3.5` |
| Inputs, selects | `h-9 text-sm`, pill (see Boli rules) |
| Body, table cells | `text-sm` |
| Meta lines | `text-xs` |
| Stat value | `text-base` to `text-xl`, `font-semibold` |

`font-semibold` is the ceiling on every heading (no `font-bold`). Nothing below `text-xs`. A displayed VALUE (a name, a
figure) may be larger; this governs headings. `text-md` is not a Tailwind class.

Radius (Boli): Button, Input, SelectTrigger and Textarea are pills (`rounded-full`, enforced by `app/boli.css`).
Cards, sheets, dialogs and tables keep `rounded-xl`/`rounded-2xl`. The shell itself is square.

## Sheets

- `SheetTitle` / `SheetDescription` carry the right sizes by default (`text-base` / `text-xs`) - never pass a size. A
  sheet is a panel over a page; its title must not out-rank the page title behind it.
- A form sheet: the `<form>` wraps the body's ScrollArea AND the `SheetFooter`, so Save never scrolls away.
- Reset a sheet's content in `onExitComplete`, never in `onOpenChange(false)` (it collapses while sliding out).

### A route-driven sheet closes to a destination, never `router.back()`

When a sheet's open state IS the URL, closing pushes the route behind it. `back()` pops one history entry - after a
sheet opened a sheet, or from a pasted link, that reopens the previous sheet or leaves the app.
- Work the destination out ONCE at mount (the router cache can keep a slot mounted after the URL moved).
- Flip `open` to false first, navigate after `SHEET_EXIT_MS` (from `@repo/ui/components/ui/sheet`), or the exit never
  plays.
- `router.back()` on a button labelled "Go back" on a full page is fine.

## This Worker has a 64 MiB ceiling

The app is ONE Cloudflare Worker (64 MiB uncompressed). What keeps it small - each line has cost megabytes elsewhere:
- Built with webpack (`next build --webpack`), never Turbopack (it copies shared server modules into every route).
- `patches/next@16.4.6.patch` stays; a new `next` version means re-making it.
- The server `splitChunks` hook in `next.config.js`; `"minify": true` and `"keep_names": false` in `wrangler.jsonc`.
- Fewer route entries: one dispatcher route plus rewrites (`/api/cron/[job]`, `/api/documents/[...path]`), not a new
  `route.ts` per endpoint; no API route for a read a Server Action can do.
- A `'use server'` file registers EVERY export on every route whose tree imports it. The layout imports only
  `actions/notification.action.ts` (the bell); guards and helpers live in `server-only` modules
  (`lib/notifications.ts` holds `createNotification` for exactly this reason).
