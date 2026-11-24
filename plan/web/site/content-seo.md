# Content SEO to gurukulhq's level (apps/web)

| | |
|---|---|
| **App / module** | `web/site` |
| **Status** | In progress |
| **Opened** | 2026-11-24 |
| **Last updated** | 2026-11-24 |
| **Files** | apps/web/content/{authors,topics}.ts, content/README.md, CLAUDE.md, lib/{content-shared,content,schema,seo,routes,og,feed,accept-markdown}.ts, scripts/build-content.ts, components/content/*, app/(public)/{blog,guides,changelog,models}/**, app/sitemap.ts, app/llms.txt, app/page.tsx, middleware.ts, public/_headers |

## What was asked

Bring apps/web's content SEO up to gurukulhq's: an author registry, validated frontmatter for faqs / takeaways /
topics / updated, a Key takeaways box and an FAQ section (+ FAQPage JSON-LD) on posts and guides, topic pages,
CollectionPage + ItemList JSON-LD and per-page OG images on the indexes, `Service` instead of `SoftwareApplication`,
dateModified / lastmod from `updated`, an RSS feed, markdown for agents if simple, and the docs updated. Keep the MDX ->
.jsx compile in build-content. Learn from gurukulhq; copy none of its text.

## What "done" looks like

curl on the running dev server shows, per page, the title, description, canonical, og:image and the JSON-LD types
listed in the tasks below; /blog/rss.xml is valid RSS 2.0; build-content rejects a bad author, topic, faq or takeaway.

---

## Tasks

- [x] **1. Authors + topics registries, frontmatter (faqs, takeaways, topics, updated) validated by build-content**
  - Verified: `node --import tsx scripts/build-content.ts` -> "3 posts, 2 guides, 10 changelog entries (0 published)";
    a temp file proved each check stops it with file + field: unknown author "niraj", unknown topic "nope", 2
    takeaways, faq without "?", unknown fact "{{nope}}", published date 2099-01-01 in the future.
- [x] **2. Article: author block, Key takeaways box, topic chips, FAQ section (EditorialFaq) + FAQPage JSON-LD**
  - Verified: curl /blog/how-nepal-types has id="key-takeaways", id="questions", "About the author", 3 topic chip
    links; JSON-LD BlogPosting, BreadcrumbList, FAQPage (guides: TechArticle + FAQPage).
- [x] **3. /blog/topics and /blog/topics/[topic] (CollectionPage + ItemList + BreadcrumbList)**
  - Verified: /blog/topics, /blog/topics/romanized-nepali, /blog/topics/api 200 with CollectionPage + BreadcrumbList,
    own OG images 200; /blog/topics/nope 404; noindex while nothing on them is published.
- [x] **4. Index JSON-LD (CollectionPage/ItemList) + OG images for /blog, /guides, /changelog, /models, /models/boli-chat**
  - Verified: each page's og:image is its own card and returns 200 image/png; /models CollectionPage ItemList[1];
    the content indexes carry no ItemList while everything is a draft (published only, by design).
- [x] **5. Service instead of SoftwareApplication (gurukulhq's reasoning)**
  - Verified: / JSON-LD = Organization, WebSite, Service, Service, FAQPage; /models/boli-chat adds the API Service;
    grep finds no SoftwareApplication node left.
- [x] **6. lastmod/dateModified from updated, RSS at /blog/rss.xml (+ /changelog/rss.xml), alternate links**
  - Verified: both feeds 200 application/rss+xml (empty channel: all drafts); a scratch render with the drafts gave 3
    items and parsed as well-formed XML; rel=alternate RSS link on /blog, posts, topics, /changelog.
- [x] **7. Markdown for agents (/md/*.md + edge middleware for /blog/* and /guides/* only)**
  - Verified: with a temporary map entry, `Accept: text/markdown` -> 307 + Vary: Accept + private, no-store +
    x-markdown-tokens; a browser Accept and /docs -> 200 HTML; map restored by re-running the script. No md files
    exist yet (published only). Converter preview of a guide: Fact values, cost sentence, absolute links.
- [x] **8. content/README.md + apps/web/CLAUDE.md SEO section**
  - Verified: both rewritten (frontmatter, block lists, {{facts}}, registries, what a published piece gets; SEO rules,
    Service note, middleware rule).
- [x] **9. Seed posts and guides: faqs, takeaways, topics from their own text**
  - Verified: manifest.ts holds them with facts filled (e.g. "Kura uses a system prompt...").
- [ ] **10. Typecheck (lead) and a browser look at the new sections**
  - Not run: subagents never typecheck; the lead does it once.

---

## Notes / decisions

- 2026-11-24: Gurukul keeps unpublished posts live with noindex (a ledger in active-posts.ts). Boli keeps its `draft`
  gate (drafts are not built in production) - same outcome for search, simpler; added the "no published piece dated in
  the future" check from Gurukul's ledger rules.
- 2026-11-24: Two summaries run past 160 characters (reading-nepali-bills 183, support-bot guide 173) - left as the
  owner wrote them; trim if Search Console truncates.
- 2026-11-24: Changelog entries get no /md copy (they live on one page).
