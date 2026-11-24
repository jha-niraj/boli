"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowRight, Users, Wallet } from "lucide-react"
import { AppShell } from "@repo/ui/components/shell/app-shell"
import { compactRailItemClass, useProductRail } from "@repo/ui/components/shell/product-rail"
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/components/ui/tooltip"
import { AppLink, markNavPending } from "@repo/ui/components/app-link"
import { NotificationsPanel, type NotificationView } from "@repo/ui/components/ui/notifications-panel"
import type { ShellSidebar, ShellUser, ShellWorkspace } from "@repo/ui/lib/shell"
import { getNotifications, getUnreadCount, markAllAsRead, markAsRead } from "@/actions/notification.action"
import { switchWorkspace } from "@/actions/workspace-switch.action"
import { toast } from "@repo/ui/components/ui/toast"
import { BoliMark } from "@repo/brand/boli-mark"
import { BoliEmpty } from "@/components/empty/boli-empty"
import { FeedbackButton } from "@/components/feedback/feedback-button"
import { RailCreditsRow, useBalance } from "@/components/shell/credits-chip"
import { CreateWorkspaceDialog } from "@/components/shell/create-workspace-dialog"
import { KuraCompact, KuraSidebar, type KuraHistorySeed } from "@/components/kura/kura-sidebar"
import { JawafSidebarSwitcher } from "@/components/jawaf/bot-switcher"
import { BRAND, formatCredits } from "@repo/boli"
import { LAST_PRODUCT_COOKIE, isLandingProduct } from "@/lib/landing"
import { MAIN_RAIL_COOKIE, RAIL_PRODUCTS, ROUTES, productForPath, type Product } from "@/lib/navigation"

/**
 * The signed-in shell: the shared AppShell in its PRODUCT RAIL mode (plan/main/jawaf/jawaf-v1.md "Names and
 * structure"), modelled on dashboard.sarvam.ai:
 *
 * - The icon rail (56px, widens over the page on hover): the Boli mark (-> /home, the overview), the workspace
 *   switcher (with "Create workspace" at its foot), the products (Kura, API, Jawaf; Document AI and Speech greyed
 *   "Soon"), then credits (+ Add), the bell, Send feedback and the account row (name over email; its menu - Profile,
 *   Settings, Billing, Members, theme, Sign out - opens on hover or a press).
 * - The product sidebar: ONLY the open product's pages (PRODUCTS in lib/navigation.ts). Kura's is New chat + search +
 *   the chat history; Jawaf's starts with the bot switcher. Account pages (/home, /billing, /profile, /members,
 *   /settings, /notifications, /start) and the Soon pages have no sidebar - the rail alone.
 * - Collapsed (the sidebar's button or Cmd/Ctrl+\, cookie MAIN_RAIL_COOKIE): the icon rail goes off screen and the
 *   sidebar becomes a 64px icon rail (Sarvam). Each product gives its `compact` controls (Kura: New chat + a search
 *   popover with the history; Jawaf: the bot avatar), and the credits row draws itself as one coin icon there.
 * - The last product used is written to a cookie as its pages open; middleware.ts sends `/` (and so every sign-in)
 *   there, or to /start when there is none (lib/landing.ts).
 *
 * The bell opens the latest 10 in a sheet ("See all" -> /notifications). Chrome stays neutral - no crimson outside the
 * logo and the out-of-credits state (owner, 2026-11-24).
 */
const BELL_LIMIT = 10

const KEYS = {
    unread: ["notifications", "unread"] as const,
    list: ["notifications", "list"] as const,
}

/** Fallback when the workspace read failed: one item named after the person, so the rail never renders empty. */
function personalWorkspace(user: ShellUser): ShellWorkspace[] {
    const first = user.name.trim().split(/\s+/)[0]
    return [{ id: "personal", name: first ? `${first}'s workspace` : "My workspace", current: true }]
}

function sidebarFor(product: Product | null, kuraHistory: Promise<KuraHistorySeed>): ShellSidebar | null {
    if (!product || product.soon) return null
    if (product.id === "kura") {
        return {
            title: product.label,
            href: product.href,
            body: <KuraSidebar historyPromise={kuraHistory} />,
            compact: <KuraCompact historyPromise={kuraHistory} />,
        }
    }
    // The workspace's bots from a client query; the current one from a cookie (components/jawaf/bot-switcher.tsx).
    if (product.id === "jawaf") {
        return { title: product.label, href: product.href, top: <JawafSidebarSwitcher />, compact: <JawafSidebarSwitcher compact /> }
    }
    return { title: product.label, href: product.href }
}

/** The credits in the rail: the full row (Credits 99.96 + Add), or one wallet icon in the collapsed sidebar's rail. */
function RailCredits() {
    const { compact } = useProductRail()
    return compact ? <CompactCredits /> : <RailCreditsRow />
}

/** The wallet in the 64px rail: the balance in its tooltip, a crimson dot and a link to the packs when out of credits. */
function CompactCredits() {
    const { data } = useBalance()
    const value = data !== undefined ? formatCredits(data) : null
    const low = data !== undefined && data <= 0
    const label = low ? "Out of credits - add more" : value !== null ? `${value} credits` : "Credits"
    return (
        <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
                <AppLink
                    href={low ? `${ROUTES.billing}?tab=plans` : ROUTES.billing}
                    aria-label={`${label} - open Billing`}
                    className={compactRailItemClass()}
                >
                    <Wallet aria-hidden />
                    {low ? <span aria-hidden className="absolute right-2 top-2 size-2 rounded-full bg-boli-crimson" /> : null}
                </AppLink>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">{label}</TooltipContent>
        </Tooltip>
    )
}

export function MainShell({ user, initialPinned, initialRailWidth, kuraHistory, workspaces: workspaceList, children }: {
    user: ShellUser
    initialPinned: boolean
    initialRailWidth?: number
    /** Kura's history, started (never awaited) by the layout; the Kura sidebar reads it with `use()`. */
    kuraHistory: Promise<KuraHistorySeed>
    /** The person's workspaces with the current one marked (read by the layout). */
    workspaces: ShellWorkspace[]
    children: React.ReactNode
}) {
    const router = useRouter()
    const pathname = usePathname() ?? "/"
    const product = productForPath(pathname)
    const productId = product?.id ?? null

    // Remember the last LIVE product, for the landing after sign-in (lib/landing.ts). A year, readable by middleware.
    React.useEffect(() => {
        if (!isLandingProduct(productId)) return
        try {
            document.cookie = `${LAST_PRODUCT_COOKIE}=${productId}; path=/; max-age=31536000; samesite=lax`
        } catch { /* cookies blocked: the landing falls back to /start */ }
    }, [productId])

    const workspaces = React.useMemo(() => (workspaceList.length ? workspaceList : personalWorkspace(user)), [workspaceList, user])
    // Switching workspace changes credits, keys, chats and bots everywhere: set the cookie on the server, then load the
    // open product's home fresh (a full navigation, so no query cached for the old workspace survives).
    const homeHref = product && !product.soon ? product.href : ROUTES.dashboard
    const onSwitchWorkspace = React.useCallback(async (id: string) => {
        if (workspaces.find((w) => w.current)?.id === id) return
        const res = await switchWorkspace(id)
        if (!res.success) { toast.error(res.error); return }
        window.location.assign(homeHref)
    }, [workspaces, homeHref])
    const [createOpen, setCreateOpen] = React.useState(false)
    const onCreateWorkspace = React.useCallback(() => setCreateOpen(true), [])
    // Each product's sidebar element is rebuilt only when the product changes, so its state (search) survives a page
    // change inside the product.
    const sidebar = React.useMemo(() => sidebarFor(product, kuraHistory), [product, kuraHistory])
    const queryClient = useQueryClient()
    const [panelOpen, setPanelOpen] = React.useState(false)

    const unread = useQuery({
        queryKey: KEYS.unread,
        queryFn: async () => {
            const res = await getUnreadCount()
            if (!res.success) throw new Error(res.error)
            return res.data
        },
        refetchInterval: 60_000,
    })

    // Same query as the chip (one fetch), for the account menu's credits box.
    const balance = useBalance()

    const list = useQuery({
        queryKey: KEYS.list,
        enabled: panelOpen,
        queryFn: async (): Promise<NotificationView[]> => {
            const res = await getNotifications(BELL_LIMIT)
            if (!res.success) throw new Error(res.error)
            return res.data.items.map((n) => ({
                id: n.id,
                title: n.title,
                body: n.message,
                createdAt: n.createdAt,
                readAt: n.isRead ? (n.readAt ?? n.createdAt) : null,
                module: n.type.charAt(0).toUpperCase() + n.type.slice(1),
                href: n.actionUrl,
            }))
        },
    })

    const refresh = () => queryClient.invalidateQueries({ queryKey: ["notifications"] })

    return (
        <>
            <AppShell
                brand={{ name: BRAND.name, href: ROUTES.dashboard, mark: <BoliMark px={24} /> }}
                nav={product?.sidebar ?? []}
                productRail={{
                    products: RAIL_PRODUCTS,
                    activeProductId: productId,
                    workspaces,
                    onSwitchWorkspace,
                    onCreateWorkspace,
                    sidebar,
                }}
                account={{
                    user, profileHref: ROUTES.profile, signInPath: ROUTES.signIn, queryClient,
                    settingsHref: ROUTES.settings,
                    links: [
                        { label: "Billing", href: ROUTES.billing, icon: Wallet },
                        { label: "Members", href: ROUTES.members, icon: Users },
                    ],
                    credits: {
                        label: "Credits",
                        value: balance.data !== undefined ? `${formatCredits(balance.data)} credits` : undefined,
                        secondary: { label: "Usage", href: ROUTES.usage },
                        primary: { label: "Add credits", href: ROUTES.billing },
                    },
                }}
                railFooterTop={<RailCredits />}
                railFooterExtra={<FeedbackButton variant="rail" align="start" />}
                notifications={{ unread: unread.data ?? 0, onOpen: () => setPanelOpen(true) }}
                initialPinned={initialPinned}
                initialRailWidth={initialRailWidth}
                cookieName={MAIN_RAIL_COOKIE}
            >
                {children}
            </AppShell>
            <CreateWorkspaceDialog open={createOpen} onOpenChange={setCreateOpen} homeHref={homeHref} />
            <NotificationsPanel
                open={panelOpen}
                onOpenChange={setPanelOpen}
                notifications={list.data ?? []}
                loading={list.isPending && panelOpen}
                subtitle="Your latest ten."
                renderEmpty={(tab) => (
                    <BoliEmpty
                        kind="notifications"
                        title={tab === "unread" ? "You are all caught up" : "Nothing read yet"}
                        description={tab === "unread" ? "The ghanti rings when a payment lands or a key is first used." : "Notifications you have read show here."}
                    />
                )}
                onItemClick={async (n) => {
                    if (n.href) {
                        setPanelOpen(false)
                        if (/^https?:\/\//.test(n.href)) window.open(n.href, "_blank", "noopener,noreferrer")
                        else {
                            markNavPending(n.href)
                            router.push(n.href)
                        }
                    }
                    if (!n.readAt) {
                        await markAsRead(n.id)
                        await refresh()
                    }
                }}
                onMarkAllRead={async () => {
                    await markAllAsRead()
                    await refresh()
                }}
                footer={
                    <AppLink
                        href={ROUTES.notifications}
                        onClick={() => setPanelOpen(false)}
                        className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50 dark:text-neutral-200 dark:hover:bg-neutral-900"
                    >
                        See all notifications <ArrowRight className="h-3.5 w-3.5" />
                    </AppLink>
                }
            />
        </>
    )
}
