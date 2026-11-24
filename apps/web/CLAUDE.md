# apps/web - Boli's public site (bolihq.com)

The public site: landing `/`, `/about`, `/contact`, `/docs` (+ `/docs/*`), `/terms`, `/privacy`, `/blog`, `/models`,
`/guides`, `/changelog`, and `/design` (dev only, 404 in production). Next 16.4.6 + React 19 + Tailwind 4, built with
webpack, deployed as its own Cloudflare Worker through OpenNext. Port **3102**. The product (sign-in, sign-up,
onboarding, Kura, keys, billing and the `/v1` API) is `apps/main` at **app.bolihq.com** - this site only links to it.
The root `AGENTS.md` holds the general rules and `apps/main/CLAUDE.md` the Boli rules both apps share; this file is what
is specific to the site. The split and its decisions: `plan/web/site/web-split.md`.

## What the site is not

- **No auth, no session, no database reads for pages.** The site never imports `@repo/auth` and never reads a cookie, so
  every page can be static. The nav always shows "Log in" and "Sign up free" (owner, 2026-11-24).
- **No middleware.** Nothing to protect.
- **One write:** the contact form (`actions/contact.action.ts`, schema `schemas/contact.ts`) stores a `contact_message`
  row through `@repo/db` (honeypot, 5 per hour per hashed IP). It returns `ActionResult` from `@repo/errors` like every
  other action. Anything else that needs a database or a signed-in person belongs in `apps/main`.
- **No TanStack Query, no shell, no rail.** Public pages are server components with small client islands.

## Links into the app - always `lib/app-links.ts`

The app is on ANOTHER origin, so its paths (`/signin`, `/kura`, `/billing`) do not exist here.
- Build every app URL with `lib/app-links.ts` (`appUrl`, `SIGNIN_URL`, `SIGNUP_URL`, `KURA_URL`, `KEYS_URL`,
  `BILLING_URL(...)`, `API_ORIGIN` for code samples). They read `NEXT_PUBLIC_APP_URL`. **Never a relative app path and
  never a hardcoded domain.**
- Same tab, plain `<a>` (no `target="_blank"`). `next/link` cannot cross origins: use `SiteLink`
  (`components/site-link.tsx`), which renders an absolute URL as `<a>` and an in-site path as `AppLink`.
- In-site links come from `lib/routes.ts` (`ROUTES`, `DOCS_PAGES`). `apps/main` links back here through its
  `lib/web-links.ts` (`NEXT_PUBLIC_WEB_URL`); a docs slug renamed here must be renamed in main's `DocSlug` too.
- No fallback to the live domain: a missing URL falls back to localhost, never to app.bolihq.com (AGENTS.md section 4).

## Design (same Boli rules as apps/main, light only)

- Everything in `apps/main/CLAUDE.md` "Boli rules" applies: Fraunces display + Instrument Sans body + Geist Mono, the
  sky as the one accent (crimson only in the logo dot and true errors), pill controls, plain hyphens, never a closed
  model named as ours.
- **Light only.** The providers force the light theme; do not add `dark:` variants here.
- Shared look comes from packages, never a copy: `@repo/brand` (logo, mark, `type` helpers, `sky`, Dhaka, pixel art
  under `art/*` + `art/art.css`, pill and quiet controls, editorial FAQ, code tabs, loaders, status screens, and THE
  tokens `styles/boli.css` - `app/boli.css` is one import of it) and `@repo/boli` (prices, credit packs, model info,
  brand copy, code samples, the Shiki highlighter). A price or a limit on a page is read from `@repo/boli`, never typed.
- Controls from `@repo/ui` / `@repo/brand`, never a native `<button>`, `<select>` or `<input>`.
- Fonts via `next/font/local` (`app/fonts.ts`, woff2 committed), never `next/font/google`.

## Content

Blog, Guides, Changelog and Models pages are MDX and typed data under `content/`. How to add a post, a guide or a
changelog entry (frontmatter, covers, drafts): [`content/README.md`](content/README.md).

## SEO

- **No country or language segment in any URL, ever** (`/np/...`, `/en-np/...`, `/nepal/...`). Boli is Nepal-first,
  but a market is a fact in the copy and in JSON-LD, never in a path - moving indexed URLs later throws away their
  authority. Page URLs have no hyphens (AGENTS.md section 8).
- Every page sets its own `title`, `description` and a self-referencing canonical (`alternates.canonical`) on
  `NEXT_PUBLIC_SITE_URL` (`SITE.url` from `@repo/core/site`). A new page goes into `app/sitemap.ts`.
- JSON-LD (Organization, WebSite, SoftwareApplication, Article, BreadcrumbList, FAQPage) is built by helpers, not
  hand-written per page; `areaServed` is an array so a market is appended, never replaced.
- Drafts (`draft: true`) are never in the sitemap, the index pages or the feeds.
- `/design` is never indexed and 404s in production.

## Errors

Server actions return `ActionResult<T>` via `ok` / `fail` / `failWith` from `@repo/errors`; the `error` string is
user-facing (no SQL, stack or PII). `app/error.tsx` and `app/global-error.tsx` use the shared status screens.

## Worker, env and deploy

- One Worker, 64 MiB uncompressed limit, same rules as main: webpack, `"minify": true`, `"keep_names": false`,
  `nodejs_compat`. `wrangler.jsonc` top level is STAGING (`boli-web-staging`), production is `env.prod` (`boli-web`).
  The R2 incremental cache bucket is shared with main under the prefix `boli-web-cache` (`NEXT_INC_CACHE_R2_PREFIX`).
  Routes (bolihq.com + www) are still commented until the owner sets the domains up.
- Env files (all three, same keys - `pnpm env:check`): `.env.local` (dev), `.env` (staging), `.env.production`.
  Keys: `DATABASE_URL` (same database as main in that environment), `NEXT_PUBLIC_SITE_URL` (this site's origin; must
  equal main's `NEXT_PUBLIC_WEB_URL`), `NEXT_PUBLIC_APP_URL` (the app's origin; must equal main's
  `NEXT_PUBLIC_SITE_URL`). env:check enforces both pairs.
- Dev: `pnpm --filter web dev` (http://localhost:3102). Deploy (the owner runs it): `pnpm deploy:staging web`,
  `pnpm deploy:prod web`, or `all`.
