# apps/main - Boli, the product

Boli: open AI for Nepal. People sign up, get 100 free credits, chat with our own open model in **Kura** (`/kura`, where
they land after sign-in) and call an OpenAI-compatible API (`/v1/chat/completions`, base URL
`https://app.bolihq.com/v1`) with their own API keys. This app is **app.bolihq.com**, port 3100. The root `AGENTS.md`
holds the general rules; this file is what is specific to this app, and **where the two differ for Boli, this file
wins**. The build plan: `plan/main/platform/platform-v0.md`. The shared constants: `@repo/boli` (`packages/boli`).

## The split: the public site is apps/web (2026-11-24)

The landing, About, Contact, Docs, Terms, Privacy, Blog, Models, Guides, Changelog and `/design` live in `apps/web` on
**bolihq.com** (`apps/web/CLAUDE.md`, plan `plan/web/site/web-split.md`). This app has only the auth pages, onboarding,
the dashboard, Kura and the API.
- `/` has no page: `middleware.ts` sends it to the LAST product used (cookie `boli_last_product`, `lib/landing.ts`;
  Kura, API or Jawaf home) or to `/start` ("Choose where to start") when there is none, or to `/signin` signed out.
  Sign-in's default returnTo is `/`. `app/page.tsx` is only a fallback.
- **Links to the site always go through `lib/web-links.ts`** (`WEB.docs`, `WEB.doc(slug)`, `WEB.about`, `WEB.contact`,
  `WEB.contactAbout(topic)`, `WEB.terms`, `WEB.privacy`, `webUrl(path)`), built from `NEXT_PUBLIC_WEB_URL`. Never a
  relative `/docs` or `/terms` (it would 404 here) and never a hardcoded domain. Same tab; `AppLink` renders an absolute
  URL as a plain navigation.
- `SITE.url` (`NEXT_PUBLIC_SITE_URL`) is THIS app's origin: use it for the API base URL in code samples, never for a
  public page.
- The shared look and constants are packages, not copies: `@repo/brand` (logo, mark, type, sky, Dhaka, pixel art, pill
  and quiet controls, code tabs, loaders, status screens, `styles/boli.css`) and `@repo/boli` (prices, packs, models,
  copy, code samples, Shiki). Change them there; both apps pick it up.
- `robots.ts` lets only `/signin` and `/signup` be indexed; the sitemap, canonical URLs and JSON-LD belong to web.

## Boli rules (owner decisions, 2026-11-24)

- **Only our own open models.** Nothing in this app may call Claude, OpenAI or any closed model: Kura and the API run on
  `boli-chat` (llama-server, `LLAMA_BASE_URL`). Boli sells open inference; a closed model behind it would be a lie.
- **Names.** Product: Boli. Tagline: "Open AI for Nepal". The chat is **Kura** (कुरा, conversation) - in the UI, in
  routes (`/kura`) and in public copy, with the subtitle "Chat with Boli's model in Nepali, English or both". The model
  id is `boli-chat`, labelled "Gemma 4 E4B, 4-bit".
- **Credits.** 1 credit = Rs 1 (NPR). Stored in integer micro-credits (`balance_micro`, `amount_micro`, `cost_micro`);
  shown with 2 decimals via `formatCredits`. Prices, limits and copy come from `@repo/boli` - never a literal.
- **Fonts (T1).** Fraunces with SOFT 100, WONK off (`font-serif`) for display: public h1/h2, auth and welcome titles,
  big numbers. Instrument Sans (`font-sans`, body at 400) for all UI and body text. Geist Mono (`font-mono`) for code.
  Loaded with `next/font/local` in `app/fonts.ts` (Instrument Sans under `--font-geist-sans` so @repo/ui picks it up).
  A hand-set optical size or weight goes through `serif()` / `DISPLAY` from `@repo/brand/type` (inline style).
- **Colour (C5 "Clear Himalayan sky").** Warm off-white ground, near-black ink, ONE accent: the sky. `bg-boli-sky`
  (#3d8fd6, `boli-sky-dark` #6cb2ef on near-black) for bars, rings and washes; `text-boli-sky-ink` (#1d64a3 light,
  #6cb2ef dark, switches by itself) for links and eyebrows; `bg-boli-sky-soft` / `bg-boli-sky-wash` for tints. Focus
  rings and the first chart series are mapped to the sky. Buttons are near-black pills (white in dark), the rail is
  neutral. **Crimson only in the logo's dot and true error / out-of-credits states.** Tokens live in
  `@repo/brand/styles/boli.css` (`app/boli.css` imports it); use its classes, never hand-picked hex values in
  components (raw values for SVG fills: `@repo/brand/sky`).
- **Logo (R2 "Bo-li").** Two crests and a crimson end dot. `BoliLogo` (`@repo/brand/boli-logo`: the mark + "Boli" in
  Fraunces Soft 500; `size` in px or a text class) and `BoliMark` / `BoliAvatar` (`@repo/brand/boli-mark`). Below 32px
  the heavier small cut draws automatically. Never redraw it by hand;
  favicon `app/icon.svg`, `app/apple-icon.png`, `public/icon-192.png` and `icon-512.png` come from the same geometry.
- **Pills.** Buttons, inputs, select triggers and textareas are fully rounded in this app (overrides the base
  `rounded-xl` rule below; `@repo/brand/styles/boli.css` enforces it). Cards and sheets keep their normal radius.
- **Auth and welcome pages** are light only and must read as a professional product: real typographic hierarchy,
  generous spacing, the approved pixel art from `@repo/brand/art/*` (wrap art in `ArtRoot` from
  `@repo/brand/art/art-root` - art.css is loaded once by the root layout). They share one split frame: the golden
  valley on the LEFT, the form on the right under the logo with a Dhaka band at the bottom (`@repo/brand/auth-art`,
  whose logo and Back link go to the site through `WEB`). The public pages' rules are in `apps/web/CLAUDE.md`.
- **Dashboard** keeps light and dark.
- **API calls store metadata only** (no prompts or answers). Kura conversations are stored (they are the user's own).

## Layout

- `app/(main)/layout.tsx` is a SERVER layout: it reads the session (`getSession()` from `@/lib/session`, React-cached)
  and the rail cookie (`MAIN_RAIL_COOKIE`), then renders `MainShell` (`app/(main)/_components/main-shell.tsx`), which
  is the shared `AppShell` from `@repo/ui/components/shell/app-shell`. It never awaits page data.
- **Product rail + product sidebar** (Sarvam-style, `plan/main/jawaf/jawaf-v1.md`): `MainShell` passes `productRail`
  to `AppShell` (`packages/ui/src/components/shell/product-shell.tsx`). A 56px icon rail (Boli mark -> /home, the
  workspace switcher, the products, then credits + Add, the bell, Feedback and the account menu) widens OVER the page on
  hover; beside it a sidebar shows ONLY the open product's pages. Account pages (/home, /billing, /profile, /members,
  /settings, /notifications, /start) and the Soon pages have no sidebar. Kura's sidebar is New chat + search + the chat
  history (`components/kura/kura-sidebar.tsx`; the layout starts its read as a promise); Jawaf's starts with the bot
  switcher.
- **Two states, as dashboard.sarvam.ai** (owner, 2026-11-25), toggled by the sidebar's collapse button and Cmd/Ctrl+\:
  - EXPANDED (default): the 56px icon rail (hover-widens over the page) + the full product sidebar (resizable,
    200-360px, width in `boli_rail_hidden_w`). The page starts at 56px + the sidebar width.
  - COLLAPSED: the icon rail slides off screen and the product sidebar becomes ONE 64px icon rail at the far left
    (`CompactSidebar` in `shell/product-sidebar.tsx`): the expand button, the product's `compact` controls (Kura: New
    chat + a search icon whose popover holds the search and the history; Jawaf: the bot as an avatar opening the same
    menu), the pages as icons with tooltips (active on a soft pill, gaps between groups kept), then `CompactRailFoot`
    (`shell/product-rail.tsx`): a Products menu (every product + Boli home), credits (a coin; `useProductRail().compact`
    tells the app's rows to draw compact), Feedback, the bell and the account menu. The page starts at 64px.
  - No hover-peek in either state: the button or the shortcut. Transitions are transform / width, 200ms, off under
    reduced motion. The choice is the cookie `MAIN_RAIL_COOKIE` (`boli_rail_hidden`, "1" = collapsed), read by the
    (main) layout -> `initialPinned` (true = expanded), so the first frame is right. On an account page (no sidebar)
    the state does not apply and the shortcut does nothing. Phone (bottom bar + Products sheet) and apps/admin (the
    classic AppShell) are unchanged.
- `lib/navigation.ts` holds `ROUTES` and `PRODUCTS` (id, label, icon, home, route prefixes, sidebar items). To add a
  page to a product: a folder under `app/(main)/`, a route constant, an item in that product's `sidebar` (`tab: true`
  for the phone bottom bar). To add a product: an entry in `PRODUCTS` (+ `LANDING_HOMES` in `lib/landing.ts` once live).
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
