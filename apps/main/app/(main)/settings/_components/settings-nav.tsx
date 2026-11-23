"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { Bell, Link2, Palette, UserRound, type LucideIcon } from "lucide-react"
import { AppLink, markNavPending } from "@repo/ui/components/app-link"
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@repo/ui/components/ui/select"
import { cn } from "@repo/ui/lib/utils"
import { ROUTES } from "@/lib/navigation"

interface SettingsSection {
    href: string
    label: string
    icon: LucideIcon
}

/** The hub's sections, in order. `/settings` redirects to the first. */
export const SETTINGS_SECTIONS: SettingsSection[] = [
    { href: ROUTES.settingsNotifications, label: "Notifications", icon: Bell },
    { href: ROUTES.settingsAppearance, label: "Appearance", icon: Palette },
    { href: ROUTES.settingsAccounts, label: "Connected accounts", icon: Link2 },
]

/** Lives elsewhere, listed under the sections so everything about "me" is one place away. */
const PROFILE_LINK: SettingsSection = { href: ROUTES.profile, label: "Profile", icon: UserRound }

function useActive(): string | null {
    const pathname = usePathname() ?? ""
    return SETTINGS_SECTIONS.find((s) => pathname === s.href || pathname.startsWith(`${s.href}/`))?.href ?? null
}

/** Desktop: a narrow column of links left of the section page. */
export function SettingsRail() {
    const active = useActive()
    return (
        <nav aria-label="Settings" className="hidden w-56 shrink-0 flex-col gap-0.5 px-3 pt-3 lg:flex">
            <p className="px-2.5 pb-2 text-xs font-medium text-neutral-600 dark:text-neutral-400">Settings</p>
            {SETTINGS_SECTIONS.map((s) => <RailLink key={s.href} section={s} active={active === s.href} />)}
            <div className="my-2 h-px bg-neutral-200 dark:bg-neutral-800" />
            <RailLink section={PROFILE_LINK} active={false} />
        </nav>
    )
}

function RailLink({ section, active }: { section: SettingsSection; active: boolean }) {
    const Icon = section.icon
    return (
        <AppLink
            href={section.href}
            aria-current={active ? "page" : undefined}
            className={cn(
                "flex h-9 min-w-0 cursor-pointer items-center gap-2.5 rounded-xl px-2.5 text-sm transition-colors",
                active
                    ? "bg-neutral-100 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-white"
                    : "text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-900 dark:hover:text-white",
            )}
        >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{section.label}</span>
        </AppLink>
    )
}

/** Phone and tablet: one Select above the section page. */
export function SettingsSelect() {
    const router = useRouter()
    const active = useActive()
    return (
        <div className="shrink-0 px-4 pt-3 lg:hidden">
            <Select
                value={active ?? undefined}
                onValueChange={(href) => {
                    markNavPending(href)
                    router.push(href)
                }}
            >
                <SelectTrigger className="h-9 w-full rounded-xl text-sm" aria-label="Settings section">
                    <SelectValue placeholder="Settings" />
                </SelectTrigger>
                <SelectContent emptyMessage="No sections">
                    {SETTINGS_SECTIONS.map((s) => (
                        <SelectItem key={s.href} value={s.href}>{s.label}</SelectItem>
                    ))}
                    <SelectSeparator />
                    <SelectItem value={PROFILE_LINK.href}>{PROFILE_LINK.label}</SelectItem>
                </SelectContent>
            </Select>
        </div>
    )
}
