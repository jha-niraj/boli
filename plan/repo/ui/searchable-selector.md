# Searchable selector (ComboSelect) for choosable values

| | |
|---|---|
| **App / module** | `repo/ui` (+ admin Jawaf demos, web contact) |
| **Status** | In progress |
| **Opened** | 2026-11-25 |
| **Last updated** | 2026-11-25 |
| **Files** | `packages/ui/src/components/ui/combo-select.tsx`, `packages/core/src/geo/nepal.ts`, `packages/boli/src/jawaf.ts`, admin `jawaf/demos/_components/demo-form-sheet.tsx` + `demo-sheet.tsx`, admin inbox schema/types/lib prefill, web `contact/_components/contact-form.tsx` + `schemas/contact.ts` |

## What was asked

Owner, 2026-11-25: "add the selector for all these options so they don't have to type, with a search and an Other
option - choosing Other lets them type; pay attention to city and district; on admin AND the main app; wrapped in a
ScrollArea after a fixed height".

## What "done" looks like

- One shared `ComboSelect` in `@repo/ui`: pill trigger, popover with search, grouped options in a ScrollArea capped at
  about 18rem, keyboard support, emptyMessage, optional "Other" that turns the control into a text input with a
  "back to the list" button.
- Nepal places (7 provinces, 77 districts, ~70 cities with district) in `@repo/core/geo/nepal`, option builders grouped
  by province. Sector list next to the Jawaf business types in `@repo/boli/jawaf`.
- Admin New demo + prospect edit: Type, City, Sector, Owner are ComboSelects. Web contact pilot panel: City (and an
  optional Sector) are ComboSelects. Server validation still accepts the list values or free text.

---

## Tasks

- [ ] **1. ComboSelect component** (`packages/ui/src/components/ui/combo-select.tsx`) - written; not typechecked or
  opened yet (the subagent may not; the lead runs the scoped typecheck and the browser pass).
- [x] **2. Nepal places data + option builders** (`packages/core/src/geo/nepal.ts`, export `@repo/core/geo/nepal`)
  - Verified: `node --experimental-strip-types count.mts` printed `provinces 7 districts 77 { koshi: 14, madhesh: 8,
    bagmati: 13, gandaki: 11, lumbini: 12, karnali: 10, sudurpashchim: 9 }`, `unique districts 77`, `cities 98 unique 98
    bad district []`, `{ metropolitan: 6, 'sub-metropolitan': 11, municipality: 81 }`, `nepalDistrictOptions().length 77`.
- [ ] **3. Sector list** `JAWAF_SECTORS` (24) + `jawafSectorOptions()` + `jawafBusinessTypeOptions()` in
  `@repo/boli/jawaf` - written, typecheck pending (lead).
- [ ] **4. Admin demo forms** - New demo sheet: Type, Sector, City, Owner are ComboSelects (a listed sector suggests its
  type while the type is "Something else"; the city shows "<district> district, <province>" under it). Prospect edit
  sheet: Owner, City, Sector, Type. Stage stays a plain Select (4 fixed values). Typecheck + browser pending (lead).
- [ ] **5. Web contact pilot panel** - City is a ComboSelect with Other (required, as before), new optional Sector
  ComboSelect; business type stays pill chips (6 values). `sector` added to the schema and the `details` jsonb, read
  back in admin (inbox schema/type, contact sheet row, DemoPrefill -> New demo form). Typecheck + browser pending.
- [-] **6. District column on jawaf_prospect** - not added: every listed city carries its district, so a picked city
  already implies it; an "Other" city is typed as "Birtamod, Jhapa". A column would need a staging DB script while
  another agent is changing the Jawaf engine, for a field nobody filters by yet.
- [-] **7. apps/main fields** - main has no typed city / district / sector / country / timezone field today: Jawaf setup
  asks business type as pill chips (6 values), /welcome already uses chips + Other, profile asks only a name. Facts
  ("Location") are rich text, not a choice. Nothing converted; listed in Notes.

---

## Verification pass

- [ ] Typecheck scoped to changed files (lead)
- [ ] Admin New demo sheet + demo sheet, web /contact?topic=Jawaf opened at desktop and 390px (lead)

## Notes / decisions

- Left as typed text on purpose: business / bot / workspace names, emails, websites, slugs, phone numbers, notes,
  announcement "Audience note" (a free note, not a filter), admin system settings values, credit amounts, the billing
  grant email (a user search, not a fixed list), Jawaf custom-field labels and select options (owner-defined data).
- `@repo/ui/components/ui/location-selector` keeps its own older Nepal map (values "Nawalparasi (East)", "Eastern
  Rukum"); not switched to the new data because stored rows may hold those strings. `NEPAL_DISTRICTS` lists them as
  search aliases.

- Values stored are the LABELS (city name, sector label), so existing free-text rows still read, an Other value is
  just another string, and the list view shows them unchanged.
