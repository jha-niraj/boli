"use client"

import { Home } from "lucide-react"
import { useAdminAccess } from "@/context/admin-access-context"
import type { AdminPermission, PermissionLevel } from "@/lib/permissions"
import { ROUTES } from "@/lib/navigation"
import { AppLink } from "@repo/ui/components/app-link"
import { Button } from "@repo/ui/components/ui/button"
import { BoliStatus } from "@repo/brand/status/status-screen"

interface PermissionGateProps {
    module: AdminPermission
    level?: PermissionLevel
    children: React.ReactNode
    fallback?: React.ReactNode
}

/**
 * Hides a PART of a screen the admin cannot use (a write button, a section). A whole page is gated on the server
 * with `requireAdminPage(module)`, which redirects to the 403 screen - never render a page and then hide it.
 */
export function PermissionGate({ module, level = "read", children, fallback }: PermissionGateProps) {
    const { can } = useAdminAccess()
    if (can(module, level)) return <>{children}</>
    return <>{fallback ?? null}</>
}

/** The 403 screen inside the shell: Boli's pasal with its shutter down. */
export function AccessDeniedView() {
    return (
        <BoliStatus
            kind="forbidden"
            description="This part of the console needs a permission you don't have. Ask a super admin for access."
            actions={(
                <Button asChild variant="outline" className="h-10 cursor-pointer gap-2 px-5">
                    <AppLink href={ROUTES.home}><Home className="h-4 w-4" /> Back to home</AppLink>
                </Button>
            )}
        />
    )
}

/** Convenience hook - true if the current admin can do this. */
export function useCanAccess(module: AdminPermission, level: PermissionLevel = "read"): boolean {
    const { can } = useAdminAccess()
    return can(module, level)
}
