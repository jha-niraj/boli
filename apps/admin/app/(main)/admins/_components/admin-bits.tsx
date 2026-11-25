"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/ui/avatar"
import { cn } from "@repo/ui/lib/utils"
import { formatAdminStatus } from "@/types/admin"

/** Query keys for the team screens; every mutation invalidates `["admins"]`. */
export const ADMIN_KEYS = {
    all: ["admins"] as const,
    team: ["admins", "team"] as const,
    invitations: ["admins", "invitations"] as const,
}

export function initialsOf(name: string | null | undefined, email: string | null | undefined): string {
    const base = (name || email || "?").trim()
    const parts = base.split(/\s+/).filter(Boolean)
    if (parts.length > 1) return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase()
    return base.slice(0, 2).toUpperCase()
}

export function PersonAvatar({ name, email, image, className }: {
    name: string | null | undefined
    email: string | null | undefined
    image?: string | null
    className?: string
}) {
    return (
        <Avatar className={cn("h-8 w-8 shrink-0", className)}>
            {image ? <AvatarImage src={image} alt="" /> : null}
            <AvatarFallback className="text-xs font-medium">{initialsOf(name, email)}</AvatarFallback>
        </Avatar>
    )
}

/** The status word with a small dot - the dot is the only colour, the word carries the state. */
export function StatusDot({ status }: { status: string }) {
    const dot = status === "ACTIVE" ? "bg-emerald-500" : status === "SUSPENDED" ? "bg-rose-500" : "bg-neutral-400"
    return (
        <span className="inline-flex items-center gap-1.5 text-sm text-neutral-700 dark:text-neutral-300">
            <span aria-hidden className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dot)} />
            {formatAdminStatus(status)}
        </span>
    )
}

/** A neutral pill for a role or a level. */
export function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <span className={cn("inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300", className)}>
            {children}
        </span>
    )
}

/** A date (and time) in Nepal time, fixed locale and zone so the server and the browser print the same text. */
export function formatDate(value: Date | string | null | undefined, withTime = false): string {
    if (!value) return "-"
    const d = typeof value === "string" ? new Date(value) : value
    if (Number.isNaN(d.getTime())) return "-"
    return new Intl.DateTimeFormat("en-GB", withTime
        ? { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kathmandu" }
        : { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kathmandu" }).format(d)
}
