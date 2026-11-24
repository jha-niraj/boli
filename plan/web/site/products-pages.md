# Public Products section: /products, /jawaf, /kura

| | |
|---|---|
| **App / module** | `web/site` |
| **Status** | In progress (round 2) |
| **Opened** | 2026-11-25 |
| **Last updated** | 2026-11-25 |
| **Files** | `apps/web/app/(public)/{products,jawaf,kura}/*`, `components/public/{links,site-nav,mobile-menu,product-cards,faq-section,language-exchanges}.tsx`, `app/_landing/{jawaf,cta-band}.tsx`, `lib/{routes,schema,og}.ts`, `app/sitemap.ts`, `app/llms.txt/route.ts` |

## What was asked

Owner, 2026-11-25: a Products page listing the products, and a full landing page per product (Jawaf: all sections, how
it works, FAQs, reviews) - Kura and Jawaf for now. URLs at the top level: `/products`, `/jawaf`, `/kura` ("looks more
professional" than /products/jawaf).

## Decisions

- No reviews or testimonials until real pilot businesses give them (fabricated reviews are not allowed); Jawaf has a
  "Be one of the first" pilot section instead.
- Jawaf: "In pilot", "Free during the pilot", "Planned price" from `JAWAF_PRICES`; no Service JSON-LD until it can be
  bought. Kura: Service JSON-LD (live).

## Tasks

- [x] **1. /products, /jawaf, /kura pages + nav, footer, landing cards, sitemap, llms.txt, OG images**
  - Verified: `tsc --noEmit` (web) - no errors; Chrome :3102/jawaf hero renders (pixel shop scene, In pilot, Join the
    pilot, See how it works).
- [ ] **2. Owner review of copy** - example exchanges, FAQ claims for features still being built, "Free during the pilot".
  - Verified: _(owner)_

## Round 2 - show, don't tell (owner, 2026-11-25)

Owner: "This page has too much text and content but not the Dhaka arts, gradients and pixel and sections like the
landing page, and the hero section should be full screen like the landing page hero. The content is good but we should
SHOW it really well - learn from the landing page."

Decisions:
- A shared `ProductHero` (components/public/product-hero.tsx): the landing hero's composition (full first screen under
  the sticky nav, Fraunces display headline, one line, two pills, a wide pixel scene along the bottom, phone crop below
  sm, a Dhaka band on the bottom edge), with a soft sky glow behind the copy.
- Two new wide scenes in `@repo/brand/art`: `jawafBanner` (the pasal + QR stand, 200 x 60) and Kura's banner crop
  (`KuraScene wide`, the elder and the student by the stupa, 200 x 48). Phones keep the 96 x 60 / 112 x 48 scenes.
- Every section: kicker + Fraunces heading + at most two short lines + a visual. Paragraph cards become mock UI, step
  strips with pixel icons, chips and short labels. Facts kept; the long ones live in the FAQ.

- [x] **3. ProductHero + wide scenes (jawafBanner, Kura wide)**
  - Verified: rasterised the scene grids to PNG with a scratch script (tsx + a node PNG encoder): jawafBanner reads as a
    street (house, pasal + "bihana 10 baje!", flags, QR stand + student "kati baje khulcha?", pagoda, elder); Kura
    200 x 48 keeps the stupa conversation centred with a house and pagoda on the sides; the 112 x 48 original renders
    as before (build(KURA_W) adds no tiles).
- [ ] **4. /jawaf rebuilt: hero, problem bubbles, 4-step strip, knows (source chips), ways in (phone link page, A5 QR
      poster, website bubble mocks + code tabs), honesty (not-found bubble + contact card in 3 scripts), languages,
      who (pixel chips), pricing card, pilot CTA band, FAQ, CTA**
      - Code written; not yet verified (lead: typecheck + browser pass at 1440 and 390).
- [ ] **5. /kura rebuilt the same way, shorter** - code written; settings detail moved into a new FAQ answer.
- [ ] **6. /products: full-screen hero (day valley banner), Dhaka between bands** - code written.
- [x] **7. Rule in apps/web/CLAUDE.md: every public page matches the landing**
  - Verified: section "Every public page matches the landing (owner, 2026-11-25)" added after Design; grep for en/em
    dashes in the changed files printed nothing.
- [ ] **8. Lead: typecheck web + brand, browser pass at 1440 and 390**
