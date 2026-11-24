# Design pass v1 - from "works" to premium

| | |
|---|---|
| **App / module** | `main/design` (shell, Kura, dashboard, landing, about, docs, brand) |
| **Status** | In progress |
| **Opened** | 2026-11-24 |
| **Last updated** | 2026-11-24 |
| **Files** | `app/boli.css`, `app/fonts.ts`, `components/brand/*`, `app/page.tsx` + `_landing`, `(public)/about`, `(public)/docs`, `(main)/kura`, `packages/ui/src/components/shell/*`, `lib/navigation.ts`, new `app/design/*` |

## What was asked (owner feedback 2026-11-24, 24 screenshots)

v0 works; now it must look professional and premium, Sarvam-level smoothness, with its own identity (not a copy, not
"another SaaS tool"). Specifically:

**Shell and dashboard (dark mode)**
1. Rail and page are two different blacks - the seam shows (img 18).
2. Kura's header is not aligned: "Kura" sits on the grid line with no padding; the crosshair grid lines and the header
   do not line up (img 18-20).
3. With the rail collapsed, the header and the grid lines overlap; "Show side panel" crosses the line (img 21). Content
   must stay inside its lines at every rail / panel state.
4. Composer: on hover the textarea shows its own grey rounded block that does not match the box below (img 22).
5. Rail footer: replace the "Feedback" pill with a plus icon so the profile row gets the space (img 23). The round "N"
   overlapping the avatar is the Next.js dev indicator - move it out of the way.
6. No red in the rail: the active item's crimson icon and left bar go (img 33, 40).
7. The rail must be ready for product segments - chat now, speech-to-text and text-to-speech later - grouped like
   Sarvam's "Build" / "API Playground" (img 41). Models gets its own place.
8. Empty space at the top right of a page header gets the filters/tabs (Usage: range and source chips move up, img 39).
   A rule for every page.

**Brand**
9. The logo/icon is bad - needs options to choose from (img 24).
10. A `/design` route that shows every design frame (logo options, illustrations, components) for approval.
11. Font: Inter reads too bold. Sarvam uses Season Mix (display) + Matter (body) at weight 425 - both paid. Lighter
    weight or a more premium face.

**Landing**
12. Too much red (crimson CTA, crimson italics) (img 25).
13. Hero takes the full first screen.
14. Sarvam-grade sections: expanding numbered panels (img 27), gradient art cards (img 28), footer with an image-filled
    wordmark (img 29) - ours reads as a faint grey "Boli" (img 30).
15. FAQ looks like a generic SaaS accordion (img 31) - our own accordion, select, etc.
16. Smooth scroll: nav "Pricing" scrolls to the section.

**About**
17. Tell the story with SVG animation: the gap (no open, hosted Nepali models), who it is for (students, developers,
    anyone), "nobody runs a business on a local model - they want it fine-tuned and hosted for them".
18. Illustrations: cleaner, animated (flags flapping), people. Shown first on the design route.

**Docs**
19. Too much gap at the top (img 34-35).
20. TOC: creative active indicator (a line that bends to follow the section) (img 36).
21. Code: add TypeScript, real syntax highlighting everywhere code is shown (img 38).
22. Docs stay light.

**Payments**
23. Put eSewa and Khalti sandbox keys in the env files.

**Everything else** - apply the same bar to what was not mentioned.

## Research done (2026-11-24)

- sarvam.ai walked in Chrome: Season Mix 425 for h1 (64px, -1.6px tracking) and h2 (525), Matter 425 body, 0.35-0.4px
  tracking on small text; native `scroll-behavior: smooth` (no Lenis); soft gradient-grain art cards with one white
  glyph; numbered expanding panels; a near-white ground with very little colour; dark pill CTA, light pill secondary.
- 21st.dev accordion and footer blocks browsed: big-wordmark footers (outlined, image-filled, dotted), image-panel
  accordions.
- eSewa UAT: product code and secret are published in the eSewa developer docs - set in `.env.local` and `.env`
  (`ESEWA_ENV=test`). Khalti sandbox needs a merchant account on test-admin.khalti.com to issue a test secret key.


---

## Tasks

Wave 1 (parallel agents, 2026-11-24):

- [ ] **A. Shell and dashboard bugs** (items 1-8): one dark ground + shadow, Kura header and grid lines aligned in every
  rail/panel state, composer hover, Feedback -> plus icon, Next dev indicator moved, no red in the rail, rail groups
  (live items only), header-right filters (Usage first).
  - Acceptance: Chrome at 1512px with rail pinned / peeking and Kura panel open / closed, dark and light; 390px frame.
  - Verified (partial, 2026-11-24, Chrome dark at 1456-1512px): rail, gutter and Kura column all compute to
    rgb(18,19,20); Kura header + lines + "+" marks aligned in all four rail/panel states; rail groups Playground /
    Build / Learn, no crimson; Feedback is an icon button; dev indicator bottom-right; Usage chips in the header.
    Still to check: light mode, 390px, composer hover. Lead updated apps/main/CLAUDE.md colour rule.
- [ ] **B. /design (localhost only): logo, type, colour, components** (items 9-11, 15): 4 logo directions x 2-3
  variations; 3-4 free font pairings at lighter weights; crimson-almost-nowhere palettes; editorial FAQ accordion, select,
  tabs in the same character.
  - Acceptance: `/design` renders in dev and 404s when NODE_ENV is production.
  - Verified (2026-11-24, Chrome): /design Logo (L1-L12) and Type (T0-T4) tabs render; agent also added /design to
    the light-only list in providers.tsx.
- [ ] **C. /design illustrations** (items 14, 17-18): animated pixel art (flags, clouds, people), self-drawing SVG line
  art, gradient-grain glyph cards, Dhaka textile pattern, footer wordmark fill options.
  - Acceptance: shown under /design's Illustrations tab; respects prefers-reduced-motion.
  - Verified (2026-11-24, Chrome): P1 valley, S3 panels, G cards, F1 and F5 footers render. Lead renamed line-art
    codes L1-L3 to S1-S3 (clashed with logo codes). Typecheck main + admin exit 0 after wave 1.
- [ ] **D. Docs and code** (items 19-22): top gap, bending TOC indicator, Shiki highlighting with cURL / Python /
  TypeScript / JavaScript / Go everywhere code is shown (docs, landing, Kura Code tab).
  - Acceptance: every code block highlighted, 5 tabs, Worker size kept in mind (fine-grained Shiki, JS engine).
  - Verified (partial, 2026-11-24, Chrome /docs/quickstart): top gap ~40px, three column labels on one line, TOC
    active segment follows scroll, 5 tabs with marks, Python and Go highlighted in the quiet theme, callout neutral.
    Still to check: bends on nested items, 390px, Kura Code tab dark. Worker size to measure on the owner's next build
    (TypeScript grammar is the biggest piece).
- [ ] **E. Payments sandbox** (item 23): eSewa set; Khalti key set by the owner via `pnpm env:set`; test both checkouts.
  - Verified:

Wave 2 (approved 2026-11-24, building now): apply logo + fonts + palette; rebuild landing (full-screen hero, no red,
own sections, editorial FAQ, filled footer wordmark, smooth anchor scroll), about (animated story), then full Chrome
pass, then the real-model test.

- [ ] **Wave 2 C. Dashboard** (agent C, 2026-11-24): Home H1 (launchers that never truncate, Get started from real
  rows, hide remembered per user in cookie `boli_getstarted_hidden`), Kura K1 v2 (KS1 scene day/dusk, PC3 suggestion
  cards, model chip with live dot, Think as a switch, R2 avatar on replies), Billing tabs Credits | Plans | History with
  pack cards (server-side pack table in `@repo/billing` plans.ts, `startBuyPack`, grant = `payment.credits` under
  `purchase:<paymentId>`; no schema change - `pack_code` and `credits` already on `payment`), Dhaka bands (pack cards,
  Get started, empty states, Models card), sky accent on charts and links. New: `components/brand/boli-mark.tsx`,
  `components/art/frame.ts`, `components/platform/{sky.ts,dhaka-band.tsx,dhaka-empty.tsx}`.
  - Verified: not run (build without checks, per the brief). Lead: one typecheck + Chrome pass.

## Notes / decisions

- 2026-11-24 wave 2 built (3 agents, no checks during build) + lead Chrome pass and fixes. Typecheck main + admin
  exit 0. Verified in Chrome: landing top to bottom at 1512px and 390px; About at 390px; Home, Kura, Billing > Plans
  (dark, desktop + 390/360px); sign-in at desktop and 390px; phone menu dropdown opens, closes on outside tap.
  Lead fixes from the pass and owner notes: hero valley moved UNDER the copy with a new 240x78 banner layout
  (BANNER_LAYOUT) so the headline sits in clear sky; Kura suggestion card Dhaka band pinned to the top; dark-mode
  rail/page seam softened (faint light edge + wide soft shadow, packages/ui surfaces.ts); custom amount + pay buttons
  in one row; Home key slice no longer wraps; empty Kura opens at the top; landing phone menu is a dropdown (Radix,
  closes outside); Kura header icons PanelRightOpen/Close (from state), MessagesSquare (History), Plus (New chat);
  sign-in method switch has a bordered track; auth pages get "Back" (to /) beside the logo; remaining "Add credits"
  links go to /billing?tab=plans. Not yet seen: Kura's new header icons (browser left signed out - reading the test
  password was blocked), onboarding frame, real-model replies.

- 2026-11-24 FINAL approval: valley v3 day (landing) + golden (auth); PS1, PS2, TM2, KS1 approved. Landing uses PS1
  right after the hero AND PS2 further down with different content. Auth: art on the LEFT, form on the right. Use the
  Dhaka art inside the dashboard too. Home launcher cards must not truncate or clip (owner screenshot: "Chat in
  Nepali, English...", "Quickstart in 5 langua..." cut off; Kura bubble overflowing). "Build it all" with parallel
  agents, no checks during the build, then the full Chrome pass, then the real-model test.
- Lead prep: approved art copied to apps/main/components/art (production home; /design keeps its own copy until it is
  deleted); CREDIT_PACKS (100/500/1,000->1,050/5,000->5,500) added to lib/boli.ts.

- 2026-11-24 round 3 landed: /design is now three tabs (Final, Art, Screens); rejected options and their files deleted;
  research notes in app/design/_art/RESEARCH.md. Typecheck main exit 0; Chrome: Art tab renders, P1-V3 day valley
  with faces, pigeons, turn-taking bubbles. Unused packages to remove at build time: @fontsource-variable/newsreader,
  @fontsource/young-serif, @fontsource-variable/geist, @fontsource-variable/figtree. Awaiting owner approval.

- 2026-11-24 /design **round 3** (one agent owns app/design):
  - Research first: `apps/main/app/design/_art/RESEARCH.md` (10 rules with links - faces first, one clothing colour per
    person, coloured outlines, perfect slopes only, no stray pixels, hue-shifted ramps, depth by value, no outer AA,
    text as a half-pixel UI layer; palettes and pixel-font licences checked; kept the drawn font).
  - **P1-V3**: new kit (`_art/valley/kit.ts`, `palette.ts`, `scene.ts`, `pixel/scenery.ts`): people ~25px tall with
    real faces, coloured outlines, blink frames; clean ridges (slopes 0.5/1/2, regular snow drips); one hue-shifted
    palette for day and golden; bubbles with a 2-thick border and shadow; Boudha pigeons; a pale cloth behind the
    shopkeeper. Layouts: wide 160x84 and portrait 96x120 (phone crop, auth panel; one bubble at a time there).
  - Story scenes PS1/PS2 rebuilt at 96x60 on the same kit; F5 now the v3 valley in Fraunces Soft; Team **TM2**
    (four pixel busts in role scenes: desk + code, GPU rack, sketchbook, chautari); Kura **K1 v2** (pixel scene KS1 of
    two people in kura by the stupa, dusk in dark; PC3-style suggestion cards; model chip with a live dot; Think as a
    switch).
  - /design pruned to three tabs: **Final** (R2 logo sheet, T1 scale, C5 tokens with live contrast, Components, PC3,
    Plans, FAQ2, Dhaka, F5), **Art** (P1-V3 day/golden wide + portrait, PS1/PS2, TM2, KS1), **Screens** (WF1 with the
    real art, H1, K1 v2, A1 with the golden valley). Deleted: round-1 logo/type/colour sections, `_logos`, gradient
    grain, line art, round-1 pixel art, Dhaka D1-D3 extras, footers F1-F4, PC1/PC2, the sky picker and C2/C4/C6, R1/R3.
    `_round2` renamed `_parts`.
  - Verified: every scene rendered to PNG with react-dom/server + sharp at display size and looked at; all three
    tabs server-render without errors; a script confirmed every relative import resolves and is used. Not run:
    typecheck, lint, browser (per the brief).
  - Unused packages now (owner to remove): `@fontsource-variable/newsreader`, `@fontsource/young-serif`,
    `@fontsource-variable/geist`, `@fontsource-variable/figtree`.

- 2026-11-24 owner picks from /design round 2:
  - Logo **R2 "Bo-li"** (two crests, one drawing at every size). Accent **C5 Clear Himalayan sky** (#3d8fd6 fill,
    #1d64a3 text, #6cb2ef dark). Product cards **PC3 hybrid**. PS2 story panels liked.
  - Valley: **P1-V1 day** for the landing, **golden hour (P1-V2) for auth** - but make people and text clearer still
    (pixel, but properly readable); research pixel-art techniques and tools first.
  - Approved to build later: WF1 landing + packs + FAQ2, H1 /home, A1 auth. Team: pixel portraits in small role scenes
    (placeholders), shown on About. Kura K1: empty state needs more care (real pixel scene, PC3-style suggestions,
    restyled model chip and Think); conversation view unchanged.
  - **Art first, then build**: nothing goes into the real app until /design is final. Prune older options from
    /design as decisions land.

- 2026-11-24 owner picks from /design round 1:
  - Logo: **L8 The thread** (thread rising into a voice wave, ending in a speech dot), ink + one tiny crimson accent
    (the dot); lockup name set in **Fraunces Soft**. "Do it properly and perfectly."
  - Type: **T1 Fraunces (soft) + Instrument Sans**.
  - Colour: C2 direction but the deep blue feels hard - show **3 sky shades** next to the current blue before deciding.
  - Hero: **P1 valley by day** at the bottom of a full-screen hero, but clearer: bigger pixels, story in front, keep the
    elements (don't cut), cleaner and easier to read.
  - Footer: **F5** serif "Boli" filled with the day valley.
  - Art: all four families stay. Story art = **pixel scenes with bold coloured outlines** that draw in row by row
    (merging line drawing's reveal with pixel clarity). Gradient-grain icon cards are rejected ("just an icon") -
    replace with **real product moments** and experiment with **Dhaka-framed cards**. Dhaka pattern: use more (plans).
  - Plans: **credit packs, smaller** (Rs 100 / 500 / 1,000 / 5,000, small bonuses) **plus the custom amount**; free
    100 on sign-up. Lives in **Billing tabs: Credits | Plans | History**; Dhaka band on pack cards.
  - Landing order: **story order** - Hero, The gap (pixel story), Products (product-moment cards; Speech marked next),
    Code (5 languages), Who it's for, Pricing packs, FAQ, CTA band, Footer F5.
  - FAQ: editorial list; **left column (title) sticky while the questions scroll** on the right.
  - About: story in 4 pixel scenes, roadmap (chat -> document intelligence -> speech -> fine-tune/hosting),
    principles, **team section** (placeholder people for now, hidden later behind a flag), contact form.
  - Home: keep layout restyled + "Get started" checklist + Sarvam-style launcher cards; wireframe on /design first.
  - Kura: restyle + pixel touch (L8 mark as avatar, small pixel scene in the empty state).
  - Auth/onboarding: split screen - form left with a slim Dhaka band at the bottom left, P1 v2 valley right with one
    line, nothing else (Sarvam-clean).
  - Public pages stay light only. /design Components tab approved as-is.
  - Side quest done: Document Intelligence explainer https://claude.ai/artifact/BCNpzCs5MvyyabdXPGZSmG
    (copy in docs/artifacts/document-intelligence.html).
  - Side quest: an explainer artifact on document intelligence (how Gemma or another open model reads images/PDFs,
    and Boli's path to ship it) - agent running.

- 2026-11-24 owner answers: clear bugs now, taste items on /design first; fonts = 3-4 free pairings; crimson almost
  nowhere (logo + one tiny detail; near-black pill buttons); logo directions = all four (Devanagari mark, speech +
  mountain, prayer-flag thread, wordmark only) "think properly"; rail = labelled groups, live items only; dark mode =
  one black + soft shadow; illustrations = all four directions on /design; FAQ = editorial list; code = cURL, Python,
  TypeScript, JavaScript, Go (owner plans a Go backend later) with Shiki; /design = localhost only, deleted later.
- Khalti: the browser tool refuses to read the sandbox secret off the page (correctly); the owner sets it with
  `pnpm env:set`. KHALTI_ENV=test set in `.env.local` and `.env`.

- 2026-11-24: eSewa sandbox values set (`ESEWA_PRODUCT_CODE`, `ESEWA_SECRET_KEY`, `ESEWA_ENV=test`) in
  `apps/main/.env.local` and `.env`; `.env.production` left blank.

- 2026-11-24: /design **Round 2** tab (first, default) built in `apps/main/app/design/_round2/`, all set in T1 with a
  sky picker (C2/C4/C5/C6) that re-tints every frame: logo L8 refinements **R1-R3** (small cut at 16-24px, lockups,
  favicon, app tiles, rail, landing nav), **sky C4-C6** with live WCAG ratios, product cards **PC1-PC3**, pricing
  **P-landing / P-billing** (packs Rs 100/500/1,000 +5%/5,000 +10%, custom from Rs 100, Enterprise; Billing tabs
  Credits | Plans | History light + dark), **FAQ2** sticky left column, team mock **TM1** (flag-hidden until real),
  landing wireframe **WF1** (zoom 40/60/100), **/home H1** (launchers, Get started, light/dark + 390px), Kura **K1**,
  auth **A1**. Dhaka bands import `_art/dhaka/pattern.tsx` read-only. Not yet rendered in a browser or typechecked.
