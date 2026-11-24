# content/ - Blog, Guides, Changelog

One MDX file per piece: `content/blog/<slug>.mdx`, `content/guides/<slug>.mdx`, `content/changelog/<slug>.mdx`. The file
name is the URL (`/blog/<slug>`, `/guides/<slug>`, `/changelog#<slug>`): lowercase words joined by hyphens.

`scripts/build-content.ts` reads every file before `pnpm --filter web dev` and `build` (or run `pnpm --filter web
content`), checks the frontmatter, and writes `content/generated/` (the index, one compiled .jsx per file, the
markdown-pages map), `public/llms-full.txt` and `public/md/{blog,guides}/<slug>.md` (published pieces only). Commit the generated files with the content. A bad field stops the script with the file and the
field named. Restart `dev` after adding a file (an edit to an existing file reloads on its own).

## Frontmatter

```yaml
---
title: How Nepal types                 # the page title and h1
date: 2026-11-24                       # YYYY-MM-DD, sorts the lists (newest first); never moved once published
updated: 2026-12-02                    # optional, when meaningfully revised (dateModified, sitemap lastmod, "Updated")
category: Product                      # blog only: Launch | Product | Research | Company
summary: One or two sentences.         # the description, the card line, the meta description
author: boli-team                      # blog and guides: an id from content/authors.ts
cover: keyboard                        # blog and guides: launch | keyboard | bill | dhaka | docsDesk | contactPasal | legalElder | aboutScorecard | aboutBench
draft: true                            # true = development only (with a Draft badge); never built, listed, indexed or fed in production
tags: [Kura, Romanized Nepali]         # optional; changelog tags: API | Kura | Billing | Docs | Site | Models | Account
topics: [romanized-nepali, kura]       # blog and guides, at least one: ids from content/topics.ts (the /blog/topics hubs)
takeaways:                             # optional, 3 to 5 lines under 200 characters: the "Key takeaways" box at the top
  - "Small open models often answer Romanized Nepali in Devanagari."
  - "A system prompt that maps each way of writing fixes most of it."
  - "{{kura}} sends that prompt; your API calls can too."
faqs:                                  # optional: the "Questions" section at the end + FAQPage JSON-LD
  - q: What is Romanized Nepali?       # a question ends with "?"
    a: Nepali written with Latin letters, as most people type it on a phone.
---
```

Block lists (`takeaways`, `faqs`) are indented two spaces under their key; each item starts with `- `. Wrap a line in
double quotes when it contains `: ` or starts with `{{` (otherwise it reads as a key). Numbers about Boli in
`takeaways` and `faqs` are written `{{name}}` (`{{welcomeCredits}}`, `{{inputPrice}}`, `{{rateLimit}}`, `{{context}}`,
`{{model}}` ... the names of `<Fact>`, listed in `scripts/content-text.ts` FACTS) and filled from `@repo/boli` at build;
an unknown name stops the script. Never a hardcoded app domain in frontmatter (`{{apiBase}}` bakes the live one in -
say "Boli's /v1 endpoint" instead).

The script also stops on: an author or topic id that is not registered, 1-2 or 6+ takeaways, a faq without `q` and
`a`, `updated` before `date`, and a **published** piece dated in the future (keep `draft: true` until its day - a
future date would put a lastmod ahead of today in the sitemap).

### Authors (`content/authors.ts`)

A typed registry: name, role, bio, kind (Organization for the team, Person for a named human), avatar (the Boli mark,
a pixel portrait from `@repo/brand/art/team`, or initials) and public profile links. The page shows the byline and a
"Written by" block; JSON-LD `author` is the site Organization (team) or a Person with jobTitle, knowsAbout and sameAs.
Real people only, never an invented name.

### Topics (`content/topics.ts`)

A subject, not a content type: title (the hub's h1 and title) and a 110-160 character description (the meta
description). `/blog/topics/<id>` lists the posts AND guides on it. A hub exists only once something on it is visible
(published, in production): never built empty, linked or in the sitemap before. Never rename a published id.

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

## What a published piece gets (nothing to do by hand)

- Its page: byline with the author, topic chips, Key takeaways, the body, Questions, "Written by", Read next.
- JSON-LD: BlogPosting (posts) or TechArticle (guides) with author, dates (dateModified = `updated ?? date`), keywords
  and `about` topics; BreadcrumbList; FAQPage when it has faqs.
- An OG card (its title and cover), the sitemap (lastmod = `updated ?? date`), the blog RSS feed (`/blog/rss.xml`) or
  the changelog feed (`/changelog/rss.xml`), its topic hubs, `/llms.txt`, `/llms-full.txt`, and a markdown copy at
  `/md/<kind>/<slug>.md` that `Accept: text/markdown` on its URL redirects to.
- A draft gets none of these in production (and is `noindex` in development).


## Claims must say what was tested (owner, 2026-11-24)

AI moves fast and a result for one model says nothing about another. Any post that reports a measurement must state,
in the post: the exact model and size (parameters), the precision (for example 4-bit), the runtime, the hardware, the
date, the sample size, and **what was not tested**. Questions in `faqs` and lines in `takeaways` are scoped the same
way ("the small model we tested", not "open models"). Never generalise from one model to "AI can't" or "open models
can't".
