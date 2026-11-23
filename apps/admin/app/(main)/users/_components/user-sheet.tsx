"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { UserCheck, UserX } from "lucide-react"
import { PanelRow, PanelRows } from "@repo/ui/components/ui/section-panel"
import { Button } from "@repo/ui/components/ui/button"
import { ConfirmPopover } from "@repo/ui/components/ui/confirm-popover"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@repo/ui/components/ui/sheet"
import { Skeleton } from "@repo/ui/components/ui/skeleton"
import { toast } from "@repo/ui/components/ui/toast"
import { getUserById, updateUserStatus } from "@/actions/user.action"
import { getUserPlatform, revokeUserApiKey } from "@/actions/user-platform.action"
import { useAdminAccess } from "@/context/admin-access-context"
import { formatAdminRole } from "@/lib/permissions"
import type { AdminUserPlatform, UserDetail, UserRow } from "@/types/admin"
import { formatDate, PersonAvatar, Pill } from "../../admins/_components/admin-bits"
import { USER_KEYS } from "./users-query"

async function fetchDetail(id: string): Promise<UserDetail> {
    const r = await getUserById(id)
    if (!r.success || !r.data) throw new Error(r.error ?? "Could not load the user")
    return r.data
}

/**
 * One user in the keep-open right sheet. It opens at once with the row's own fields and fills the rest (bio, admin
 * access, updated) when the detail read lands. Pressing another row swaps it (the grid carries `data-sheet-keep-open`).
 */
export function UserSheet({ row, open, onOpenChange, onExitComplete }: {
    row: UserRow | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onExitComplete?: () => void
}) {
    const queryClient = useQueryClient()
    const { can } = useAdminAccess()
    const canWrite = can("users", "write")

    const detail = useQuery({
        queryKey: USER_KEYS.detail(row?.id ?? ""),
        queryFn: () => fetchDetail(row!.id),
        enabled: !!row && open,
    })

    const platform = useQuery({
        queryKey: USER_KEYS.platform(row?.id ?? ""),
        queryFn: async (): Promise<AdminUserPlatform> => {
            const r = await getUserPlatform(row!.id)
            if (!r.success) throw new Error(r.error ?? "Could not load API keys and usage")
            return r.data
        },
        enabled: !!row && open,
    })

    const revokeKey = useMutation({
        mutationFn: async (keyId: string) => {
            if (!row) return
            const r = await revokeUserApiKey(row.id, keyId)
            if (!r.success) throw new Error(r.error ?? "Could not revoke the key")
        },
        onSuccess: async () => {
            toast.success("Key revoked")
            await queryClient.invalidateQueries({ queryKey: USER_KEYS.platform(row?.id ?? "") })
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Could not revoke the key"),
    })

    const setActive = useMutation({
        mutationFn: async (isActive: boolean) => {
            if (!row) return
            const r = await updateUserStatus(row.id, isActive)
            if (!r.success) throw new Error(r.error ?? "Could not change the status")
        },
        onSuccess: async (_d, isActive) => {
            toast.success(isActive ? "User activated" : "User deactivated")
            await queryClient.invalidateQueries({ queryKey: USER_KEYS.all })
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Could not change the status"),
    })

    const user = detail.data ?? row
    const isActive = detail.data?.isActive ?? row?.isActive ?? true

    return (
        <Sheet open={open} onOpenChange={onOpenChange} onExitComplete={onExitComplete}>
            <SheetContent side="right" className="flex w-full flex-col gap-4">
                <SheetHeader>
                    <SheetTitle className="truncate">{user?.name || user?.email || "User"}</SheetTitle>
                    <SheetDescription className="truncate">{user?.email}</SheetDescription>
                </SheetHeader>
                {user ? (
                    <ScrollArea orientation="vertical" className="-mx-6 min-h-0 flex-1">
                        <div className="flex flex-col gap-4 px-6 pb-2">
                            <div className="flex min-w-0 items-center gap-3">
                                <PersonAvatar name={user.name} email={user.email} image={user.image} className="h-12 w-12" />
                                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                                    <Pill>{user.role === "ADMIN" ? "Admin" : "User"}</Pill>
                                    <Pill>{isActive ? "Active" : "Inactive"}</Pill>
                                    <Pill>{user.emailVerified ? "Email verified" : "Email not verified"}</Pill>
                                </div>
                            </div>
                            <PanelRows>
                                <PanelRow label="Joined">{formatDate(user.createdAt, true)}</PanelRow>
                                <PanelRow label="Last updated">
                                    {detail.data ? formatDate(detail.data.updatedAt, true) : <Skeleton className="h-4 w-32" />}
                                </PanelRow>
                                <PanelRow label="Admin access">
                                    {detail.data
                                        ? (detail.data.adminAccess ? `${formatAdminRole(detail.data.adminAccess.adminRole)} (${detail.data.adminAccess.status.toLowerCase()})` : "None")
                                        : <Skeleton className="h-4 w-24" />}
                                </PanelRow>
                                <PanelRow label="User ID" valueClassName="truncate font-mono text-xs text-neutral-600 dark:text-neutral-400">{user.id}</PanelRow>
                            </PanelRows>
                            {detail.data?.bio ? (
                                <div className="flex flex-col gap-1">
                                    <h3 className="text-base font-semibold text-neutral-900 dark:text-white">Bio</h3>
                                    <p className="whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-300">{detail.data.bio}</p>
                                </div>
                            ) : null}
                            <PlatformSection
                                data={platform.data}
                                loading={platform.isPending}
                                failed={platform.isError}
                                canWrite={canWrite}
                                revoking={revokeKey.isPending ? (revokeKey.variables ?? null) : null}
                                onRevoke={(id) => revokeKey.mutateAsync(id)}
                            />
                            {detail.isError ? (
                                <p className="text-xs text-neutral-600 dark:text-neutral-400">Some details could not be loaded. Close and open the user again.</p>
                            ) : null}
                        </div>
                    </ScrollArea>
                ) : null}
                {user && canWrite ? (
                    <SheetFooter>
                        <Button type="button" variant="outline" className="cursor-pointer rounded-xl" onClick={() => onOpenChange(false)}>Close</Button>
                        {isActive ? (
                            <ConfirmPopover
                                title="Deactivate this user?"
                                description="Their account is marked inactive until someone activates it again."
                                confirmLabel="Deactivate"
                                side="top"
                                onConfirm={() => setActive.mutateAsync(false)}
                            >
                                <Button type="button" variant="outline" disabled={setActive.isPending} className="cursor-pointer gap-2 rounded-xl">
                                    {setActive.isPending ? <InlineLoader size={14} label="Saving" /> : <UserX className="h-4 w-4" />}
                                    Deactivate
                                </Button>
                            </ConfirmPopover>
                        ) : (
                            <Button type="button" disabled={setActive.isPending} onClick={() => setActive.mutate(true)} className="cursor-pointer gap-2 rounded-xl">
                                {setActive.isPending ? <InlineLoader size={14} label="Saving" /> : <UserCheck className="h-4 w-4" />}
                                Activate
                            </Button>
                        )}
                    </SheetFooter>
                ) : null}
            </SheetContent>
        </Sheet>
    )
}

const credits = (micro: number) => (micro / 1_000_000).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Boli platform: usage totals and the user's API keys (name, prefix, created, last used, status), revoke for users:write. */
function PlatformSection({ data, loading, failed, canWrite, revoking, onRevoke }: {
    data: AdminUserPlatform | undefined
    loading: boolean
    failed: boolean
    canWrite: boolean
    revoking: string | null
    onRevoke: (id: string) => Promise<void>
}) {
    return (
        <>
            <div className="flex flex-col gap-1">
                <h3 className="text-base font-semibold text-neutral-900 dark:text-white">Usage</h3>
                <PanelRows>
                    <PanelRow label="Requests, 30 days">{data ? data.last30.requests.toLocaleString("en-US") : <Skeleton className="h-4 w-16" />}</PanelRow>
                    <PanelRow label="Credits spent, 30 days">{data ? credits(data.last30.costMicro) : <Skeleton className="h-4 w-16" />}</PanelRow>
                    <PanelRow label="Requests, all time">{data ? data.allTime.requests.toLocaleString("en-US") : <Skeleton className="h-4 w-16" />}</PanelRow>
                    <PanelRow label="Credits spent, all time">{data ? credits(data.allTime.costMicro) : <Skeleton className="h-4 w-16" />}</PanelRow>
                </PanelRows>
            </div>
            <div className="flex flex-col gap-1">
                <h3 className="text-base font-semibold text-neutral-900 dark:text-white">API keys</h3>
                {failed ? (
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">API keys and usage could not be loaded. Close and open the user again.</p>
                ) : loading || !data ? (
                    <div className="flex flex-col gap-1">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
                ) : data.keys.length === 0 ? (
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">No API keys.</p>
                ) : (
                    <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
                        {data.keys.map((k) => (
                            <li key={k.id} className="flex min-w-0 items-center gap-3 py-2">
                                <div className="min-w-0 flex-1">
                                    <p className="flex min-w-0 items-center gap-2">
                                        <span className="truncate text-sm font-medium text-neutral-900 dark:text-white">{k.name}</span>
                                        {k.revokedAt ? <Pill>Revoked</Pill> : null}
                                    </p>
                                    <p className="truncate text-xs text-neutral-600 dark:text-neutral-400">
                                        <span className="font-mono">{k.prefix}****</span> - created {formatDate(k.createdAt)} - last used {k.lastUsedAt ? formatDate(k.lastUsedAt, true) : "never"}
                                    </p>
                                </div>
                                {canWrite && !k.revokedAt ? (
                                    <ConfirmPopover
                                        title={`Revoke "${k.name}"?`}
                                        description="Apps using this key stop working at once. This cannot be undone."
                                        confirmLabel="Revoke"
                                        side="top"
                                        onConfirm={() => onRevoke(k.id)}
                                    >
                                        <Button type="button" variant="outline" size="sm" disabled={revoking === k.id} className="shrink-0 cursor-pointer rounded-xl">
                                            {revoking === k.id ? <InlineLoader size={14} label="Revoking" /> : null}
                                            Revoke
                                        </Button>
                                    </ConfirmPopover>
                                ) : null}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </>
    )
}
