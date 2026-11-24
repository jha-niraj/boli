# Jawaf quality eval

The test set behind the plan's quality bar (`plan/main/jawaf/jawaf-v1.md`, "Quality bar before any demo"): about 40 real
questions per public business site - Romanized Nepali, Devanagari and English, plus questions the bot must refuse - run
through THE answer engine (`apps/main/lib/jawaf/answer.ts`, the same function the playground, public page, widget and
API use). Bars: >= 85% correct, >= 90% correct refusals, >= 95% right script, 0 invented prices. Re-run after every
engine change.

## Run it

Needs the local model servers (boli-chat on `LLAMA_BASE_URL`, bge-m3 on `LLAMA_EMBED_BASE_URL`) and
`FIRECRAWL_API_KEY` for building. Writes go to the database in `apps/main/.env.local` (the shared staging database).

```bash
cd apps/main
T="../../packages/db/node_modules/.bin/dotenv -e .env.local -- ../../packages/db/node_modules/.bin/tsx --conditions=react-server"

# 1. Build the bot with the real ingest (map, read, chunk, embed, draft facts), approve the drafts unchanged.
#    --pages keeps Firecrawl spend modest and inside the bot's 20 free pages.
$T ../../ml/jawaf-eval/build.mts --workspace <workspaceId> --site https://gurukulhq.com --slug eval-gurukulhq \
   --name "Gurukul HQ" --type education --pages 20 --approve

# 2. Ask every question. --verbose prints every answer; --only en-01,ro-02 runs a subset.
$T ../../ml/jawaf-eval/run.mts --questions ../../ml/jawaf-eval/questions/gurukulhq.json
```

`--conditions=react-server` makes the `server-only` imports in `lib/jawaf` resolve to their empty build. Scripts are
`.mts` (top-level await) and import packages by relative path (bare `@repo/*` names do not resolve from `ml/`).

## Question files

`questions/<site>.json`: `{ site, slug, questions: [{ id, script, q, expect?: string[], mustRefuse?: true }] }`.
`expect` items must all appear in the reply (case-insensitive, Devanagari digits and thousands separators normalised,
`a|b` = either, matched at a word start). `mustRefuse` = the site does not say it, so the right reply is the not-found
reply. Write questions from the pages the bot actually read, and refusals the site cannot answer (not ones it answers
partly).

- `gurukulhq.json` - gurukulhq.com (the owner's own product, a school management system): 33 answerable
  (15 English, 10 Romanized, 8 Devanagari) + 8 must-refuse.

## Next sites (not scraped yet)

Four more public Nepali sites, one per business type, for the 5-site bar (each answered HTTP 200 on 2026-11-25; nothing
else fetched). Check each one's robots.txt and keep to ~25 pages each when building. Alternates that also answered:
https://ku.edu.np, https://www.norvichospital.com.

| Type | Site | Why it is a good test |
|---|---|---|
| Education / consultancy | https://www.kist.edu.np (KIST College) | Programmes, admission, fees pages; mixed English and Nepali |
| Clinic / hospital | https://www.grandehospital.com (Grande International Hospital) | Departments, doctors, OPD hours, packages with prices |
| Real estate | https://www.nepalhomes.com (Nepal Homes, listings + agency pages) | Locations, prices per listing, contact and process questions; tests the page ranking on a listing-heavy site |
| Shop | https://www.goldstar.com.np (Goldstar shoes, single-brand store) | Products, stores, delivery and returns, prices that change often |

Pick replacements if a site blocks crawlers in robots.txt or is mostly images.
