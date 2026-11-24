# Modules - every route

Paths are relative to the app (`apps/main/...`, `apps/admin/...`). "Tables" are SQL names (see [`data.md`](data.md)).
Every signed-in page checks the session itself and has a `loading.tsx` unless noted. Billing and payment routes are
listed by name only - see [`payments.md`](payments.md).

## apps/main

### Public and auth pages

| URL | What the person does | Files | Data | States |
|---|---|---|---|---|
| `/` | No page since the web split (2026-11-24): `middleware.ts` redirects to `/kura` (signed in) or `/signin`; `app/page.tsx` is a fallback redirect. The public site is `apps/web` (see below) | `middleware.ts`, `app/page.tsx` | none | - |
| `/signin` | Sign in by password or a 6-digit email code (`?method=code`), or Google; notices for `?error=`, `?stale=1`, `?reset=1`, `?deleted=1` | `app/(auth)/signin/page.tsx`, `_components/signin-form.tsx` | better-auth (`session`, `account`, `verification`) | `(auth)/loading.tsx` = `AuthFormSkeleton`; `SigningInScreen` after success; errors as sentences via `clientErrorMessage` |
| `/signup` | Name, email, password (strength meter) or Google; then `/verifyemail` | `app/(auth)/signup/...`, `signup-form.tsx` | `user`, `account` | error notice |
| `/verifyemail` | "Check your inbox" + resend (30s cooldown); `?done=1` lands from the link (signed in -> Continue); `?error=` bad link | `app/(auth)/verifyemail/...`, `verify-email.tsx` | `verification` | sent / done / failed |
| `/forgotpassword` | Ask for a reset link (never says whether the address exists) | `app/(auth)/forgotpassword/...`, `forgot-form.tsx` | `verification` | sent state |
| `/resetpassword?token=` | Choose a new password | `app/(auth)/resetpassword/...`, `reset-form.tsx` | `account` | bad / expired link state |
| `/welcome` | First run: name, photo (if R2 is configured), "use it for" choices, accept terms; then `/ai` | `app/(onboarding)/layout.tsx` (own session check, no shell), `welcome/page.tsx`, `welcome-flow.tsx`, `actions/onboarding.action.ts` (`saveWelcomeName`, `saveUseFor`, `acceptLegal`, `finishOnboarding`) | reads `user`, `user_setting` (`onboarding.useFor`), `legal_acceptance`; writes `user.onboarded_at`, `user.name`, `user.image`, `user_setting`, `legal_acceptance` | already onboarded -> `/ai` |

The `(auth)` group shares one `AuthFrame` (`app/(auth)/layout.tsx`, from `@repo/auth/ui`). Shared param helper:
`app/(auth)/_lib/params.ts`. Metadata files: `app/manifest.ts`, `app/robots.ts` (only `/signin`, `/signup` indexable;
the sitemap is web's). Terms and Privacy links go to the site through `lib/auth-routes.ts` (`AUTH_ROUTES.terms` /
`privacy` = `WEB.terms` / `WEB.privacy`).

### Signed-in pages (`app/(main)/`, inside `MainShell`)

| URL | What the person does | Files | Data | States |
|---|---|---|---|---|
| `/ai`, `/ai/<id>` | Full-page chat with the right column (see [`ai.md`](ai.md)). `?peek=<kind>/<id>` opens a peek; `/peek/*` redirects there (`next.config.js`) | `ai/page.tsx`, `ai/[conversationId]/page.tsx`, `ai/_components/ai-route.tsx` (server half), `components/ai/*`, `components/peeks/*`, `stores/ai-chat.store.ts`, `stores/peek.store.ts`, `actions/ai/ai.action.ts`, `lib/ai/*`, `app/api/ai/chat/route.ts` | `ai_conversation`, `ai_message`, `ai_usage_log`; tools read `user`, `session`, `note` and write `note` | `ai/loading.tsx` = `AiPageSkeleton`; welcome for a new chat; inline note under the transcript for 401 / 402 / 404 / 409 / 503; a chat id that is not yours falls back to a new chat |
| `/home` | Dashboard: StatBand, chats-per-day chart, recent activity, quick links | `home/page.tsx`, `home-view.tsx`, `home-skeleton.tsx`, `actions/dashboard.action.ts`, `lib/dashboard.ts` (`getDashboard`, one `db.batch`) | `ai_conversation`, `ai_usage_log`, `note`, `notification` | skeleton; `ChartEmpty` / `EmptyState` when nothing |
| `/notes` | Removed 2026-11-24 (Boli). Its rows, actions, PDF and the `note` table are gone; copy `/keys` for a new list module. | - | - | - |
| `/profile?tab=` | Tabs Profile (name, bio, avatar upload / remove), Security (change or set password), Sessions (devices, revoke one / all others), Account (delete account) | `profile/page.tsx` (fresh DB read + `auth.api.listSessions`), `_components/profile-view.tsx`, `profile-tab.tsx`, `security-tab.tsx`, `sessions-tab.tsx`, `account-tab.tsx`, `tabs.ts`, `avatar-image.ts`, `user-agent.ts`, `section.tsx`; `actions/profile.action.ts` | `user`, `account`, `session`; delete runs `@repo/erasure` | `profile-skeleton.tsx`; tabs switch with `history.replaceState` |
| `/settings` | Redirects to `/settings/notifications` | `settings/page.tsx`, `settings/layout.tsx` (section rail on lg, Select below), `_components/settings-nav.tsx` (`SETTINGS_SECTIONS`) | - | - |
| `/settings/notifications` | Email / in-app switch per topic (`account` email is locked on); reset to defaults | `settings/notifications/page.tsx`, `preferences-view.tsx`; `lib/settings.ts` (`getNotificationPreferences`); `actions/settings.action.ts` (`saveNotificationPreference`, `resetNotificationPreferences`) | `notification_preference` | `PageSkeleton` + `NotificationsSettingsSkeleton` |
| `/settings/appearance` | Theme, density (compact = 15px root), reduce motion | `appearance/page.tsx`, `appearance-view.tsx`; `saveAppearance` | `user_setting` (`appearance.density`, `appearance.reducedMotion`) | `AppearanceSkeleton` |
| `/settings/accounts` | Sign-in methods: password present, Google linked / link / unlink; `?error=` from a failed link | `accounts/page.tsx`, `accounts-view.tsx`; `unlinkGoogle` | `account` | `AccountsSkeleton` |
| `/settings/usage` | AI cost per window (today, last 7, last 30, this month; UTC days) and recent calls | `usage/page.tsx`, `usage-view.tsx`; `lib/usage.ts` (`getAiUsage`); action `getAiUsage` | `ai_usage_log` | `UsageSkeleton` |
| `/settings/billing` | Payments work - see [`payments.md`](payments.md) | `settings/billing/` | - | - |
| `/checkout/[paymentId]` | Payments work - see [`payments.md`](payments.md) | `checkout/[paymentId]/` | - | - |
| `/notifications?tab=unread&page=` | Inbox: All / Unread, mark read, mark all read, delete | `notifications/page.tsx`, `notifications-view.tsx`, `notifications-skeleton.tsx`, `params.ts` (`notificationsKey`); `actions/notification.action.ts` | `notification` | `EmptyState`; `InlineNote` on failure |
| `/help` | Removed 2026-11-24 (Boli): `next.config.js` redirects `/help` to the site's `/docs` (`NEXT_PUBLIC_WEB_URL`). | - | - | - |
| `/accessdenied` | 403 screen | `accessdenied/page.tsx` (`StatusView kind="forbidden"`) | - | - |

The bell (in every page's shell) reads `getUnreadCount` (every 60s) and `getNotifications(10)` from
`actions/notification.action.ts` - the only action file the layout imports.

### Status and error screens (main)

| Screen | File |
|---|---|
| 404 outside the shell | `app/not-found.tsx` (`StatusView kind="not-found"`) |
| 404 inside the shell | `app/(main)/not-found.tsx` |
| 500 / any thrown error | `app/error.tsx`, `app/(main)/error.tsx` (`AppErrorView`) |
| 403 | `app/(main)/accessdenied/page.tsx` |
| Fallback loading | `app/(main)/loading.tsx` (`AppLoader`) - only for a route without its own |

### API routes (main) {#api-routes}

| Route | What | File |
|---|---|---|
| `GET/POST /api/auth/*` | better-auth (`toNextJsHandler(auth)`) | `app/api/auth/[...all]/route.ts` |
| `POST /api/sign-out` | Answered by `worker.ts` in production; in `next dev` rewritten to `/api/auth/app-sign-out` (`signOutTwin`) | `worker.ts`, `app/api/auth/app-sign-out/route.ts` |
| `POST /api/ai/chat` | One AI turn streamed as NDJSON frames; 400 / 401 / 402 / 404 / 409 / 503 | `app/api/ai/chat/route.ts` |
| `POST /api/cron/<slot or job>` | `authorizeCronRequest` (Bearer `CRON_SECRET`), then `runCronSlot`; jobs `BUILT_IN_JOBS` + `renewalRemindersJob` | `app/api/cron/[job]/route.ts` |
| `GET /api/documents/users.pdf` | Account list PDF (admins: all, newest 5,000; others: their own row); `?download=1` | `app/api/documents/[...path]/route.ts` |
| `GET /api/documents/files/<key>` | Private R2 object: owner check, 302 to a 5-minute signed URL | same |
| `/api/payments/[provider]/[...action]` | Payments work - see [`payments.md`](payments.md) | `app/api/payments/...` |

## apps/web (bolihq.com, port 3102)

The public site, no auth and no middleware (rules: [`apps/web/CLAUDE.md`](../apps/web/CLAUDE.md)). Every link into the
app is absolute, from `lib/app-links.ts`; in-site links from `lib/routes.ts`.

| URL | What the person does | Files | Data |
|---|---|---|---|
| `/` | Landing | `app/page.tsx`, `app/_landing/` | none (static) |
| `/about`, `/contact` | Story; contact form (honeypot, 5 per hour per hashed IP) | `app/(public)/about`, `app/(public)/contact`, `actions/contact.action.ts`, `schemas/contact.ts` | writes `contact_message` |
| `/docs`, `/docs/<slug>` | API docs (`DOCS_PAGES`: quickstart, authentication, chatcompletions, models) | `app/(public)/docs/` | none |
| `/terms`, `/privacy` | Legal text | `app/(legal)/` | `@repo/legal/documents` (no DB) |
| `/blog`, `/models`, `/guides`, `/changelog` | Content sections (MDX and typed data, see `apps/web/content/README.md`) | `app/`, `content/` | none |
| `/design` | Design review (dev only, 404 in production) | `app/design/` | none |

Metadata: `app/sitemap.ts`, `app/robots.ts`.

## apps/admin

Every `page.tsx` under `app/(main)/` calls `requireAdminPage(module?)` first (`lib/admin-session.ts`): not an active
admin -> `/`; missing module -> `/accessdenied`. Every action re-checks (`requireAdminAction(module, level)` in
`actions/guard.ts`, or the older checks inside `admin.action.ts` / `user.action.ts`). Client parts read
`useAdminAccess()` (`context/admin-access-context.tsx`); write buttons are gated with `adminCan` on the client.
Each page has `loading.tsx` drawn with `PageSkeleton` + a `*-skeleton.tsx`.

| URL | Permission module | What the admin does | Files | Tables |
|---|---|---|---|---|
| `/` | none (public) | Sign in by password or email code (no Google, no sign-up) | `app/page.tsx`, `app/_components/admin-signin.tsx`, `lib/admin-auth-points.ts` | better-auth |
| `/join?token=` | none (public) | Accept an invitation: set a password, become an admin | `app/join/page.tsx`, `_components/join-form.tsx`; `getInvitationByToken`, `joinAdminInvitation` | `admin_invitation`, `user`, `account`, `admin_access`, `admin_audit_log` |
| `/home` | any admin | Greeting, analytics band (if `analytics`), recent audit entries (if `admin_management`) | `home/page.tsx`, `_components/home-client.tsx` | via `getAnalyticsData`, `getAuditLogsFiltered` |
| `/analytics` | `analytics` read | Sign-ups, activity, AI cost charts | `analytics/...`, `actions/analytics.action.ts` (`getAnalyticsData`) | `user`, `admin_access`, `admin_audit_log`, `ai_usage_log`, `payment_event` |
| `/users` | `users` read (status change: write) | Server-paginated DataGrid with filters, user sheet (details, activate / deactivate) | `users/...`, `_components/users-client.tsx`, `user-sheet.tsx`, `users-query.ts`; `actions/user.action.ts` (`getUsers`, `getUserStats`, `getUserById`, `updateUserStatus`) | `user`, `admin_audit_log` |
| `/billing` | `analytics` read; credit grants `users` write | Payments work - see [`payments.md`](payments.md) | `billing/` | - |
| `/reports/adminactivity` | `analytics` read | Admin actions over time | `reports/adminactivity/...`; `getAdminActivityReport` | `admin_audit_log`, `admin_access` |
| `/reports/financial` | `analytics` read | Financial report | `reports/financial/...`; `getFinancialReport` | `payment_event`, `ai_usage_log` |
| `/communications` | `communications` read | Overview numbers | `communications/page.tsx`, `overview-client.tsx`; `actions/communications.action.ts` | `announcement`, `broadcast` |
| `/communications/announcements?tab=&open=` | `communications` read / write / delete | List, create / edit in `SideSheet` with the tiptap editor (`components/rich-text-editor.tsx`), publish / archive, delete | `announcements/...`; `actions/announcements.action.ts` | `announcement`, `admin_audit_log` |
| `/communications/broadcasts?tab=&open=` | `communications` read / write / delete | Draft email broadcasts, send a test email | `broadcasts/...`; `actions/broadcasts.action.ts` | `broadcast`, `admin_audit_log` |
| `/admins?tab=` | `admin_management` read (writes: write) | Team list and pending invitations; invite sheet, admin sheet (status, permission matrix), revoke | `admins/page.tsx`, `_components/team-client.tsx`, `invite-sheet.tsx`, `admin-sheet.tsx`, `permission-matrix.tsx`, `admin-bits.tsx`; `actions/admin.action.ts` | `admin_access`, `admin_invitation`, `admin_audit_log`, `user` |
| `/admins/access` | `admin_management` read | Read-only access matrix; a row opens the admin sheet | `admins/access/...` | `admin_access` |
| `/admins/audit?window=&admin=&open=` | `admin_management` read | Audit log DataGrid, window + admin filters, entry in a `SideSheet` | `admins/audit/...`, `audit-window.ts`; `getAuditLogsFiltered`, `getAdminList` | `admin_audit_log` |
| `/admins/profile?tab=` | any admin | Own details, own access, change password | `admins/profile/...`; `getCurrentAdmin`, `changeAdminPassword` | `admin_access`, `user`, `account` |
| `/system/settings` | `system` read (save: write) | Platform settings, health, clear cached paths | `system/settings/...`; `actions/system.action.ts` (`getSystemSettings`, `updateSystemSetting`, `getSystemHealth`, `clearCache`) | `admin_system_settings`, `admin_audit_log` |
| `/accessdenied` | - | 403 (`AccessDeniedView`) | `accessdenied/page.tsx`, `components/permission-gate.tsx` | - |

Shell actions (bell, last-sign-in stamp): `actions/shell.action.ts` (`getShellUnreadCount`, `getShellNotifications`,
`markShellNotificationRead`, `markAllShellNotificationsRead`, `stampShellSignIn`) on `admin_notification`,
`admin_access`. API: `app/api/auth/[...all]/route.ts`, `app/api/auth/app-sign-out/route.ts`. Error / 404:
`app/error.tsx`, `app/(main)/error.tsx`, `app/not-found.tsx`, `app/(main)/not-found.tsx`.

Shared admin pieces: `components/side-sheet.tsx` (`SideSheet`, the console's keep-open right sheet with a form),
`components/admin-format.ts`, `components/permission-gate.tsx` (`PermissionGate`, `AccessDeniedView`), `types/admin.ts`,
`types/communications.ts`.
