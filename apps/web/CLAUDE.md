# apps/web - Boli's public site (bolihq.com)

The public site: landing `/`, `/products` (+ the product pages `/kura` and `/jawaf` at the top level), `/about`, `/contact`, `/docs` (+ `/docs/*`), `/terms`, `/privacy`, `/blog`, `/models`,
`/guides`, `/changelog`, and `/design` (dev only, 404 in production). Next 16.4.6 + React 19 + Tailwind 4, built with
webpack, deployed as its own Cloudflare Worker through OpenNext. Port **3102**. The product (sign-in, sign-up,
onboarding, Kura, keys, billing and the `/v1` API) is `apps/main` at **app.bolihq.com** - this site only links to it.
The root `AGENTS.md` holds the general rules and `apps/main/CLAUDE.md` the Boli rules both apps share; this file is what
is specific to the site. The split and its decisions: `plan/web/site/web-split.md`.

## What the site is not

- **No auth, no session, no database reads for pages.** The site never imports `@repo/auth` and never reads a cookie, so
  every page can be static. The nav always shows "Log in" and "Sign up free" (owner, 2026-11-24).
- **One middleware, for agents only.** `middleware.ts` (EDGE - never rename it `proxy.ts`, Next 16 forces that onto
  Node and OpenNext rejects it) runs on `/blog/:slug` and `/guides/:slug` only and redirects an explicit
  `Accept: text/markdown` request for a published piece to its prebuilt `/md/*.md`. Nothing to protect; it never reads
  a cookie. Do not widen its matcher for anything else.
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

## Every public page matches the landing (owner, 2026-11-25)

Every public page is top-notch and matches the landing page: a full-screen hero for landing-type pages, pixel art,
Dhaka bands, sky gradients, the landing's section rhythm. Show, don't tell - each section is an eyebrow + a heading + at
most two short lines + a visual. Reuse the landing components. **A page that is mostly paragraphs is not done.**
- Full-screen hero: `ProductHero` (`components/public/product-hero.tsx`) - the landing hero's composition with a wide
  pixel scene along the bottom (a phone crop below sm) and a Dhaka band on its edge. `PageHero` is for inner pages
  (docs, legal, about chapters).
- Rhythm: `Band` alternating white / ground, `DhakaBand` between the big movements (the band after it takes
  `border-t-0`), `CtaBand` (with `tone`) to close, `FaqSection` for questions. Long facts go in the FAQ, not in cards.
- Visuals before words: an animated slice (`product-slices`, `LanguageExchanges`), a pixel vignette or scene
  (`@repo/brand/art`), a mock UI card, a numbered step strip with pixel icons (`PixelIcon`, `pixel-icon-sprites.ts`).
  Mock-ups are examples, drawn with divs and spans (never controls), and never show invented customers or reviews.

## Content

Blog, Guides, Changelog and Models pages are MDX and typed data under `content/`. How to add a post, a guide or a
changelog entry (frontmatter, covers, drafts): [`content/README.md`](content/README.md).

## SEO

Learned from gurukulhq's apps/web (its lib/schema.ts, content/active-posts.ts, middleware.ts): follow the same reasoning.

- **No country or language segment in any URL, ever** (`/np/...`, `/en-np/...`, `/nepal/...`). Boli is Nepal-first,
  but a market is a fact in the copy and in JSON-LD, never in a path - moving indexed URLs later throws away their
  authority. Site page URLs have no hyphens (AGENTS.md section 8); content URLs (posts, guides, topic hubs) are
  marketing URLs and are lowercase words joined by hyphens. A published URL is never renamed.
- Every page goes through `pageMeta` (`lib/seo.ts`): its own `title`, `description`, a self-referencing absolute
  canonical on `NEXT_PUBLIC_SITE_URL`, the full og:* / twitter:* set, `feeds` for an RSS `<link rel="alternate">`
  (blog pages: `BLOG_FEED`; changelog: `CHANGELOG_FEED`). A new page goes into `app/sitemap.ts`.
- **OG images are files** (`opengraph-image.tsx` + `lib/og.tsx`, Boli's card with a pixel cover): the root one, and
  their own for /blog, /blog/[slug], /blog/topics, /blog/topics/[topic], /guides, /guides/[slug], /changelog,
  /models, /models/boli-chat, /products, /kura, /jawaf. A new index page gets its own card.
- **JSON-LD only through `lib/schema.ts`** (rendered with `<JsonLd>`): Organization + WebSite once from the root
  layout, everything else references them by @id. `areaServed` is an array so a market is appended, never replaced.
  - The product is **`Service`** (`apiServiceSchema`, `kuraServiceSchema`; offers in NPR from `@repo/boli`; Jawaf gets none while it is a pilot), **never
    `SoftwareApplication`**: Google validates that as a Software App rich result needing aggregateRating or review, and
    a made-up rating is a spam-policy violation (gurukulhq measured the errors and switched). Only with real,
    verifiable reviews: switch back AND add the genuine rating in the same change.
  - Posts: BlogPosting; guides: TechArticle - `author` from `content/authors.ts` (`authorSchema`), `dateModified`
    from `updated ?? date`; BreadcrumbList; FAQPage only when the piece has `faqs` (the visible Questions section and
    the JSON-LD are the same list).
  - Index pages (/blog, /guides, /changelog, /models, /blog/topics, each topic hub): `collectionPageSchema` - a
    CollectionPage whose ItemList holds PUBLISHED items only - plus BreadcrumbList.
- **Drafts** (`draft: true`) are the publish gate: in production never built, listed, in the sitemap, the feeds,
  `llms.txt`, `llms-full.txt`, `/md/`, a topic hub or any ItemList; in development they render with a Draft badge and
  `noindex`. A topic hub with nothing published is `noindex` in development and not built in production.
- **Dates are indexed facts.** `date` never moves once published (a moved date makes lastmod untrustworthy and Google
  stops reading it site-wide); a revision sets `updated`. A published piece cannot be dated in the future (the build
  script stops). Static pages report a fixed `STATIC_LAST_MODIFIED`, not build time.
- **Feeds:** `/blog/rss.xml` and `/changelog/rss.xml` (RSS 2.0, `lib/feed.ts`, force-static, published only).
- **For answer engines:** `/llms.txt` (route), `/llms-full.txt` and `/md/{blog,guides}/<slug>.md` (both generated by
  `scripts/build-content.ts`, static assets; headers in `public/_headers`), and the markdown middleware above. A page
  with no prebuilt markdown falls through as HTML - never faked.
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
