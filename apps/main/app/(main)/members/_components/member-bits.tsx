"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/ui/avatar"
import { cn } from "@repo/ui/lib/utils"
import { formatWorkspaceRole, type WorkspaceRole } from "@repo/boli/workspace-access"

/** The members page's query key; every workspace mutation invalidates it. */
export const MEMBERS_KEY = ["workspace", "members"] as const

function initialsOf(name: string | null | undefined, email: string | null | undefined): string {
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

/** A neutral pill for the role - words carry the state, no colour. */
export function RolePill({ role, className }: { role: WorkspaceRole; className?: string }) {
    return (
        <span className={cn("inline-flex shrink-0 items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300", className)}>
            {formatWorkspaceRole(role)}
        </span>
    )
}
