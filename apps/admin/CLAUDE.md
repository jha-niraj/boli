# apps/admin - the internal admin console

Team, access, users, audit log, reports, communications and system settings. Port 3101. Sign-in is `/` (email +
access code / password), invitations land on `/join`. The root `AGENTS.md` holds every general rule; this is only what
is specific to the console.

## Access

- `lib/permissions.ts` is the catalogue (`ADMIN_MODULES`, levels read / write / delete / full) and the one check,
  `adminCan(admin, module, level)`. SUPER_ADMIN passes everything; a TEAM_MEMBER holds exactly what is stored on their
  access row - an empty set means nothing, never "the defaults".
- `lib/admin-session.ts` (server only): `getAdmin()` (React-cached) and `requireAdminPage(module?, level?)`. **Every
  page.tsx calls `requireAdminPage(...)` first** - signed out or inactive goes to `/`, a missing permission goes to
  `/accessdenied` (the 403 screen). Every `'use server'` export checks the admin itself too.
- Client components read `useAdminAccess()` (`context/admin-access-context.tsx`), seeded by the server layout - no
  fetch, no flash. `PermissionGate` hides PART of a screen (a write button); it never gates a whole page.

## Layout

- `app/(main)/layout.tsx` is a SERVER layout: `getAdmin()` + the rail cookie (`ADMIN_RAIL_COOKIE`), then `AdminShell`
  (`app/(main)/_components/admin-shell.tsx`): the shared `AppShell` in its PRODUCT RAIL mode, the same shell as
  apps/main (`apps/main/CLAUDE.md` "Layout"; plan `plan/admin/jawaf/admin-v1.md`). The 56px icon rail holds the admin
  MODULES and widens over the page on hover (Boli mark -> /home, no workspace switcher, no credits card; the foot is
  the bell and the account row with its menu opening above); beside it the open module's sidebar. Collapse (the
  sidebar's button or Cmd/Ctrl+\) turns the sidebar into the 64px icon rail with a Modules menu at its foot; the
  cookie ("1" = collapsed) is read on the server so the first frame is right. Home, Profile and /accessdenied have no
  sidebar. Phone: the bottom bar (the module's `tab` items, or the modules on Home) + a Modules sheet.
- Modules (`lib/navigation.ts`, `adminModulesFor(admin)`): People (Users, Sign-ups, Admins, Access, Audit log), Money
  (Billing, Payments, Credits, Reports: Admin activity, Financial), Jawaf (Demos, All bots, Claims), Communications
  (Overview, Inbox, Announcements, Broadcasts), System (Settings, Health). Each item names the permission it needs; a
  module with no readable item is left out. Built on the client (its icons are components and cannot cross from the
  server). To add a page: a folder, a route in `ROUTES`, an item in its module.
- The layout imports only `actions/shell.action.ts` (the bell, the sign-in stamp). A `'use server'` file registers
  every export on every route whose tree imports it, so the shell never imports the big action files.
- Route constants: `ROUTES` in `lib/navigation.ts`. URLs carry no hyphens (`/reports/adminactivity`).
- The shell does not pad; `Page` pads its header and content column (`px-4`, max-w-7xl, `reading` = 3xl); never pad a page root again. Pages are `Page` + a `loading.tsx` drawn with
  `PageSkeleton` and the real static title.

## Screens

- Headline numbers: one `StatBand` on a module's first page. Lists: a ReUI `DataGrid` (users, audit log) or a shadcn
  `Table` in `TableCard` (`components/table-card.tsx`: the bordered card, row lines edge to edge with 16px on the
  first / last cell, a height ceiling, sideways scroll) with a sticky header and the action column pinned to the end.
- Home (`lib/home-data.ts`) and System > Health (`lib/health-data.ts`) read in server-only loaders with `db.batch`;
  `actions/home.action.ts` is the client refetch. Days are Nepal days. Homes wear the sky glow (`components/brand/sky-glow.tsx`).
- Every per-day count and "today" / "this month" is Nepal time (`lib/nepal-time.ts`); dates print in Asia/Kathmandu
  (`components/admin-format.ts`). Money is Boli's: credits only, NPR, 1 credit = Rs 1 - Billing and the Financial
  report read `lib/money-data.ts` (succeeded NPR payments, the credit ledger, Home's spend sources). Never USD, never
  the template's plans / subscriptions or ai_usage_log in a screen.
- A row with 2+ fields opens the non-modal right Sheet; rows carry `data-sheet-keep-open` so pressing another row swaps
  it. Routine confirms are a `ConfirmPopover` on the button; a dialog only for big or irreversible actions (sending a
  broadcast to everyone).
- Typography as in `apps/main/CLAUDE.md`: page `<h1>` `text-xl` through `Page` only, sections and sheet titles
  `text-base`, `font-semibold` the ceiling, nothing below `text-xs`.
