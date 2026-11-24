# content/ - Blog, Guides, Changelog

One MDX file per piece: `content/blog/<slug>.mdx`, `content/guides/<slug>.mdx`, `content/changelog/<slug>.mdx`. The file
name is the URL (`/blog/<slug>`, `/guides/<slug>`, `/changelog#<slug>`): lowercase words joined by hyphens.

`scripts/build-content.ts` reads every file before `pnpm --filter web dev` and `build` (or run `pnpm --filter web
content`), checks the frontmatter, and writes `content/generated/` (the index and one lazy import per file) and
`public/llms-full.txt`. Commit the generated files with the content. A bad field stops the script with the file and the
field named. Restart `dev` after adding a file (an edit to an existing file reloads on its own).

## Frontmatter

```yaml
---
title: How Nepal types                 # the page title and h1
date: 2026-11-24                       # YYYY-MM-DD, sorts the lists (newest first)
updated: 2026-12-02                    # optional, when meaningfully revised (sitemap lastmod)
category: Product                      # blog only: Launch | Product | Research | Company
summary: One or two sentences.         # the description, the card line, the meta description
author: The Boli team                  # blog and guides
cover: keyboard                        # blog and guides: launch | keyboard | bill | dhaka | docsDesk | contactPasal | legalElder | aboutScorecard | aboutBench
draft: true                            # true = development only (with a Draft badge); never built, listed or indexed in production
tags: [Kura, Romanized Nepali]         # optional; changelog tags: API | Kura | Billing | Docs | Site | Models | Account
---
```

Covers are pixel scenes from `@repo/brand/art/covers` (new story covers) and `@repo/brand/art/vignettes`. A new cover is a
new scene there plus its name in `COVER_NAMES` (`lib/content-shared.ts`). Company news uses `dhaka`.

## Writing

- Plain hyphens only (the script rejects en and em dashes). Real facts only; no claim beyond what is built.
- `##` and `###` headings make the "On this page" line. Changelog entries use no headings (the entry title is the h2).
- Links: `/docs/quickstart` (this site), `app:/keys` (the app, built from `NEXT_PUBLIC_APP_URL`), `https://...` (new tab).
- Numbers about Boli come from `@repo/boli`, never typed: `<Fact name="inputPrice" />`, `<CostExample input={600} output={80} />`.
  Also `<Callout title="...">`, `<CodeSamples />` (the first call in five languages), `<InstallSamples />`. All in
  `mdx-components.tsx`.
- Code blocks: ```` ```python ```` (bash, python, ts, js, go, json) are highlighted; ```` ```text ```` wraps.
