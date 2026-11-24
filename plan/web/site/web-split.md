# Split the public site into apps/web

| | |
|---|---|
| **App / module** | `web/site` (new `apps/web`), `main` cleanup, new shared packages |
| **Status** | Built - awaiting owner review |
| **Opened** | 2026-11-24 |
| **Last updated** | 2026-11-24 |
| **Files** | `apps/web/**` (new), `packages/brand/**` + `packages/boli/**` (new), `apps/main` public routes (moved out), root scripts (deploy, env:check) |

## What was asked

Separate the marketing site from the product the way gurukulhq does (`apps/web` at gurukulhq.com, `apps/main` at
app.gurukulhq.com): a new `apps/web` on the latest Next.js, auth stays on main, the design does NOT change. Add a
Sarvam-style mega-menu nav, a Blog (MDX) separate from Models / Guides / Changelog, all in Boli's UI, and SEO learned
from gurukulhq's web app.

## Decisions (owner, 2026-11-24, via the picker)

- Domains: **bolihq.com** = web (landing, about, contact, docs, legal, blog, models, guides, changelog, /design dev-only);
  **app.bolihq.com** = main (auth, onboarding, dashboard, Kura, billing, `/v1` API -> base URL `https://app.bolihq.com/v1`).
- Docs live in web. Links from web into the app open in the SAME tab, built from one `NEXT_PUBLIC_APP_URL` helper,
  never relative. Web nav always shows Log in + Sign up free (no session reading on web; pages can be static).
- Shared code moves into NEW packages (no copies): `packages/brand` (logo, mark, type, sky tokens helpers, Dhaka,
  pixel art + art.css, pill/quiet controls, editorial FAQ, code tabs) and `packages/boli` (constants from
  `lib/boli.ts`: prices, packs, model info, brand copy; code samples; Shiki highlighter).
- Contact form: web's own server action with `@repo/db` (same validation, honeypot, 5/hour hashed-IP limit).
- `/design` moves to web (dev only, 404 in production).
- Web setup: port **3102**, webpack (`next dev/build --webpack`), Next **16.4.6** (the latest release, checked with
  `npm view next version`), OpenNext + its own wrangler (`boli-web-staging` top level, prod under `env.prod`), its own
  env files, added to `deploy:staging|prod` and `env:check`.
- Main after the split: `/` -> `/kura` when signed in, `/signin` when not. **No redirects** for the old public URLs
  (not in production yet) - those routes are simply removed from main. Main links to Terms/Privacy/Docs on web via
  `NEXT_PUBLIC_WEB_URL`.
- Nav: 4 mega menus - PRODUCTS (Kura, Chat API, Document intelligence - Next, Speech - Later; card "Try Kura - 100
  free credits"), DEVELOPERS (Docs, Quickstart, API reference, Models, Pricing; card: latest model), RESOURCES (Blog,
  Guides, Changelog; card: latest post), COMPANY (About, Contact, Careers later; card: our story). Hover opens a
  full-width panel: icon + name + one-line subtitle left, 1-2 feature cards right. Phone: one dropdown with the groups.
- Sections: **Blog** `/blog` (dated stories: Launch / Product / Research / Company), **Models** `/models` +
  `/models/boli-chat` (capabilities, languages, context, prices, examples, limits; Document AI Next, Speech Later),
  **Guides** `/guides` (evergreen how-tos), **Changelog** `/changelog` (short dated entries).
- Blog = MDX files in the repo (`content/blog/<slug>.mdx`, frontmatter: title, date, category, summary, author,
  cover, draft). Pixel-art cover per post (Dhaka for company news). Index like Sarvam's: featured post + category tabs
  + grid + search. Post page: breadcrumb, title, summary, cover, article with the bending contents line, related posts.
- Seed content: drafts "Introducing Boli", "How Nepal types", "Reading Nepali bills with open models" (from
  ml/docintel/testset/REPORT.md); guides "Build a Romanized Nepali support bot with the API" and "Your first call in 5
  languages" (drafts); changelog entries from git history.
- SEO: learn from gurukulhq `apps/web` (lib/seo.ts, lib/schema.ts JSON-LD, sitemap, robots, llms.txt + markdown for
  agents, og images, canonical URLs, internal links).

## Tasks

- [ ] **A. Packages + apps/web skeleton + move public pages** (one agent): create `packages/brand` and
  `packages/boli`, point main at them, create `apps/web` (config, fonts, boli.css tokens, providers light-only,
  layout, middleware if needed, wrangler, env files from main's public keys), move landing, about, contact (+ action),
  docs, legal, /design, sitemap/robots/og into web; delete them from main.
  - Acceptance: both apps' imports resolve; nothing public left in main; web renders the same pages.
  - Done (2026-11-24, agent, no checks run per the owner - the lead verifies):
    - `packages/boli` (`@repo/boli`): `.` = boli.ts, `./code-samples`, `./highlight`, `./highlight-theme` (moved from
      apps/main/lib; deps shiki + @shikijs/langs).
    - `packages/brand` (`@repo/brand`): all of components/brand (root exports, e.g. `@repo/brand/boli-logo`), all of
      components/art (`@repo/brand/art/...`, `art/art.css`), loaders (`loaders/spinners`, `loaders/full-page`,
      `loaders/loaders.css`), status (`status/status-screen`, `status/current-path`, `status/error-view` - now takes a
      `homeHref`), and `styles/boli.css` (THE tokens; it `@source`s the package). Explicit export map (one entry per
      file). `auth-art` AuthTop/AuthLogo take `homeHref`. The pixel-himalaya generator moved to `packages/brand/scripts`.
    - Each app's `app/boli.css` is one line importing `@repo/brand/styles/boli.css`.
    - apps/main imports rewritten to the packages (122 files). Main: `/` redirects in middleware (signed in -> /kura,
      else /signin) plus a fallback `app/page.tsx`; PUBLIC list is `/verifyemail` only; providers light-only list is
      the auth + welcome pages; `lib/web-links.ts` (`WEB_URL`, `webUrl`, `WEB.docs/doc/about/contact/contactAbout/
      terms/privacy`) from `NEXT_PUBLIC_WEB_URL`; ROUTES lost docs/about/contact/terms/privacy/landing and DOCS_PAGES;
      rail Docs, home launchers/get-started/Docs button, models, keys Quickstart, billing models link, plans Enterprise,
      Kura welcome + code panel, both not-found pages, AUTH_ROUTES.terms/privacy and the auth frame's home/Back now go
      to web; `/help` redirects to web docs; new robots.ts (only /signin, /signup indexable).
    - apps/web created (port 3102, webpack, Next 16.4.6, OpenNext, wrangler `boli-web-staging` / `env.prod` `boli-web`,
      R2 cache prefix `boli-web-cache`, light-only providers, no TanStack, no middleware). Moved from main: app/page.tsx,
      app/_landing, app/(public) (about, contact, docs), app/(legal), app/design, sitemap.ts, robots.ts,
      components/public, actions/contact.action.ts, schemas/contact.ts. Copied: icon.svg, apple-icon.png, favicon.ico,
      the three woff2 fonts + fonts.ts. New: lib/app-links.ts, lib/routes.ts, components/site-link.tsx (absolute URL ->
      plain `<a>`, path -> AppLink), layout, providers, not-found, error, global-error.
    - Env: main `.env.local` / `.env` + `NEXT_PUBLIC_WEB_URL` (main has no `.env.production` yet); web's three files
      with DATABASE_URL, NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_APP_URL. `scripts/env-files.mts` APPS_WITH_ENV and
      deploy.mts not touched (task C).
  - Verified:
- [ ] **B. Nav + content sections + SEO** (after A): mega menus, Blog/Models/Guides/Changelog with MDX and seed
  content, SEO from gurukulhq.
  - Done (2026-11-24, agent, no checks run per the owner - the lead verifies):
    - Nav: `components/public/mega-menu.tsx` (client, Radix NavigationMenu: hover/focus opens, arrows, Escape and
      outside click close, closes on a link or a route change; one full-width viewport hanging off the sticky header,
      `mega-menu.css` fade/translate + height, off under reduced motion). `site-nav.tsx` builds the four panels on the
      server (items: icon tile + name + subtitle, Next/Later badges; one feature card with pixel art from lg: Try Kura
      -> sign-up, boli-chat -> /models/boli-chat, newest post or the changelog, Our story -> /about). One list in
      `links.ts` (`NAV_GROUPS`, `FOOTER_COLUMNS` now with Models, Blog, Guides, Changelog). Phone: `mobile-menu.tsx`
      grouped by the four sections, scrolls inside itself when short.
    - Content: MDX in `content/{blog,guides,changelog}/<slug>.mdx`. `scripts/build-content.ts` (runs before `dev` and
      `build`, or `pnpm --filter web content`; `node --import tsx` because the tsx CLI hung here) checks frontmatter,
      computes reading time and the h2/h3 TOC and writes `content/generated/{manifest,bodies}.ts` + `public/llms-full.txt`
      (no fs at request time - the Worker has none). `lib/content-shared.ts` (types, slugify, dates), `lib/content.ts`
      (drafts hidden in production, Draft badge in dev; related, newer/older). `next.config.js` wraps with @next/mdx,
      plugins as strings (`remark-frontmatter`, `remark-gfm`). `mdx-components.tsx`: serif h2 with anchors, GFM tables
      in a sideways-scrolling card, Shiki code blocks (`CodeBlock`), callouts, `app:/path` links into the app, and
      `<Fact>`, `<CostExample>`, `<CodeSamples>`, `<InstallSamples>` so numbers come from @repo/boli. `content/README.md`.
    - Pages: `/blog` (featured newest post, category tabs synced to `?category=` with history.replaceState, search,
      grid; phone: search + a select), `/blog/[slug]` (breadcrumb, title, summary, byline, cover, article + the docs'
      bending TOC from xl, Read next, older/newer, BlogPosting + BreadcrumbList), `/guides`, `/guides/[slug]`
      (TechArticle, ends with the API key card), `/changelog` (timeline, tags, anchors), `/models` (cards Live / Next /
      Later + `#roadmap`), `/models/boli-chat` (facts from @repo/boli, system prompt, worked cost, 5-language samples,
      thinking, fits, limits, Kura + key CTAs). Shared: `components/content/*` (cover, post-card, article-layout,
      breadcrumb, content-body, draft-badge).
    - Art: `packages/brand/src/art/covers/{scenes.ts,cover.tsx}` (exports `./art/covers/scenes`, `./art/covers/cover`):
      `launch` (golden valley, a Newari house whose windows light up), `keyboard` (phone with Latin + Devanagari keys,
      Romanized chat), `bill` (notice under a magnifier, Nepali digits highlighted, tick), `dhaka` (a Dhaka topi over
      the hills). `PixelCover` also paints any 96x60 vignette.
    - Seed (all `draft: true`): blog Introducing Boli, How Nepal types, Reading Nepali bills with open models (from
      ml/docintel/testset/REPORT.md); guides Your first call in 5 languages, Build a Romanized Nepali support bot;
      10 changelog entries from git history.
    - SEO: `lib/seo.ts` (`pageMeta`: full OG/twitter, absolute canonical; all pages moved onto it, root layout no
      longer sets canonical "/"), `lib/schema.ts` + `components/json-ld.tsx` (Organization + WebSite in the root layout;
      SoftwareApplication x2 with NPR offers + FAQPage on the landing; BlogPosting/TechArticle; BreadcrumbList),
      `lib/og.tsx` (next/og card with the cover as an SVG data URI), `app/opengraph-image.tsx`, per post and guide OG,
      `app/sitemap.ts` (content with lastmod, fixed static date), `app/robots.ts`, `app/llms.txt/route.ts` (static).
      `public/icon-192.png`, `icon-512.png` copied from main (Organization logo).
    - Deps: @next/mdx 16.4.6, @mdx-js/loader, @mdx-js/react, @radix-ui/react-navigation-menu, remark-frontmatter,
      @types/mdx, tsx (dev).
  - Verified:
- [ ] **C. Main cleanup + ops** (after A, parallel with B): main root redirect, links to web, env keys
  (`NEXT_PUBLIC_WEB_URL` in main, `NEXT_PUBLIC_APP_URL` in web), deploy scripts, env:check, docs/README + CLAUDE.md
  files (apps/web/CLAUDE.md, AGENTS.md table).
  - Done (2026-11-24, agent, no checks run per the owner - the lead verifies):
    - Ops: `web` added to `APPS_WITH_ENV` (scripts/env-files.mts) and to deploy.mts `APPS` (after main; `pnpm
      deploy:staging|prod web|all`). env-check: per-app database labels for every app (it crashed on main's missing
      `.env.production` before), new `CROSS_MATCH` (web `NEXT_PUBLIC_APP_URL` = main `NEXT_PUBLIC_SITE_URL`; main
      `NEXT_PUBLIC_WEB_URL` = web `NEXT_PUBLIC_SITE_URL`, per file). env-set skips an app whose file is missing.
    - Main never had a `.env.production` (env files are git-ignored; deploy:prod needs one), so it was created with the
      same keys as `.env`: placeholders (`__APP_PROD_URL__`, `__WEB_PROD_URL__`, `__PROD_DATABASE_URL__`, ... - same
      names as web's), blank = off for SUPPORT_EMAIL, R2_* and the live payment keys, `ESEWA_ENV` / `KHALTI_ENV` =
      `live`. No real values invented.
    - apps/web/wrangler.jsonc reviewed against main: account_id placeholder, placement, observability, minify,
      nodejs_compat, R2 cache binding (shared bucket, prefix var in both envs) match. Routes stay commented with a
      TODO, as main's are.
    - Main cleanup: no public-site leftovers found (components/public, _landing, DOCS_PAGES, relative /docs /terms
      /about /contact links, ROUTES entries: none). Middleware matcher covers `/`. Root metadata lost
      `alternates.canonical: "/"` (it pointed every page at a redirect). Removed the empty `components/brand` folder.
      Emails (packages/email) and the /v1 API errors link to no public page. No dependency became unused by the split
      (`@repo/sarvamai`, `@repo/webdata`, `@tanstack/react-table` were never imported by main - left, pre-existing).
    - Docs: AGENTS.md (apps table with web 3102 / bolihq.com, main = app.bolihq.com; packages brand + boli; Boli
      exceptions line fixed to Fraunces + Instrument Sans + sky), apps/main/CLAUDE.md (split section, package paths),
      NEW apps/web/CLAUDE.md, docs/README.md, architecture.md, modules.md (web section), env-and-deploy.md, inference
      07/08 (`@repo/boli`).
    - Open for the owner: admin has no env files at all (env:check reports it - pre-existing); fill every placeholder
      before a deploy; set routes when the domains exist.
  - Verified:
- [x] **V. One typecheck (main, web, admin) + full Chrome pass of both apps** (lead).
  - Verified (2026-11-24): tsc --noEmit after next typegen: web, main, admin, @repo/brand, @repo/boli - 0 errors
    (lead added shiki + framer-motion to @repo/brand). curl: web /, /about, /contact, /docs, /docs/quickstart, /blog,
    3 posts, /guides + 2 guides, /changelog, /models, /models/boli-chat, /terms, /privacy, /sitemap.xml, /robots.txt,
    /llms.txt, /llms-full.txt, /opengraph-image -> 200; main / -> 307 /signin. Chrome: landing unchanged with the new
    nav; all four mega menus (Products, Developers, Resources, Company) open with icon tiles, Next/Later badges and art
    cards; /blog featured post + tabs + search; post page breadcrumb, draft badge, GFM table, bending TOC; /models/
    boli-chat hero + table + TOC; /changelog timeline; main's rail Docs / "Use this from code" / API reference -> :3102.
  - Lead fix: posts 500'd in dev ("reading 'recentlyCreatedOwnerStacks'") - the .mdx webpack loader pulled a second
    React into the content chunk. scripts/build-content.ts now compiles each MDX with @mdx-js/mdx to a .jsx module
    (content/generated/mdx/**, provider @/mdx-components) that Next compiles with its own React; bodies.ts imports those.
  - Known: the bill cover's pixel date (२०८३) reads like "2oΛ3" - redraw the digits.

## Notes / decisions

- 2026-11-24 (B): SoftwareApplication JSON-LD without a rating is valid schema.org but Google's Software App rich
  result reports it as an error (gurukulhq measured this and switched to `Service`). Kept as the lead asked; switch to
  `Service` if Search Console flags it - never add a made-up rating.
- 2026-11-24 (B): every page now carries the four nav panels (art included) in its RSC payload; if page weight matters,
  move the panel art to small static images.
- 2026-11-24: gurukulhq mapped: `apps/web` (Next 16.4.6, port 3004, MDX, Turbopack dev, edge `middleware.ts` for
  markdown-for-agents, own worker `gurukul-web-staging`, shares the R2 incremental cache with main under a prefix,
  `lib/app-links.ts` builds every app URL from `NEXT_PUBLIC_APP_URL`), `apps/main` at app.gurukulhq.com.
