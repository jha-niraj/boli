"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowRight, Copy, KeyRound, Plus } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"
import { Badge } from "@repo/ui/components/ui/badge"
import { Button } from "@repo/ui/components/ui/button"
import { ConfirmPopover } from "@repo/ui/components/ui/confirm-popover"
import { EmptyState } from "@repo/ui/components/ui/empty-state"
import { Page } from "@repo/ui/components/ui/page"
import { RelativeTime } from "@repo/ui/components/ui/relative-time"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/ui/table"
import { toast } from "@repo/ui/components/ui/toast"
import { cn } from "@repo/ui/lib/utils"
import { SITE } from "@repo/core/site"
import { getApiKeys, revokeKey } from "@/actions/keys.action"
import { API_PATHS, maskKey, MAX_API_KEYS } from "@/lib/boli"
import { ROUTES } from "@/lib/navigation"
import { formatDay, PLATFORM_KEYS, TIME_ZONE } from "@/lib/platform-display"
import type { ApiKeyRow } from "@/types/platform"
import { CreateKeyDialog } from "./create-key-dialog"
import { KEYS_DESCRIPTION, KEYS_TITLE } from "./keys-skeleton"

export function KeysView({ initialData, openCreate }: { initialData: ApiKeyRow[]; openCreate: boolean }) {
    const queryClient = useQueryClient()
    const [createOpen, setCreateOpen] = React.useState(openCreate)

    const { data: keys } = useQuery({
        queryKey: PLATFORM_KEYS.keys,
        queryFn: async () => {
            const r = await getApiKeys()
            if (!r.success) throw new Error(r.error ?? "Your API keys could not be loaded.")
            return r.data
        },
        initialData,
    })

    // `?create=1` did its job once the dialog opened; a refresh should not open it again.
    React.useEffect(() => {
        if (!openCreate) return
        const url = new URL(window.location.href)
        url.searchParams.delete("create")
        window.history.replaceState(window.history.state, "", url.toString())
    }, [openCreate])

    const revoke = useMutation({
        mutationFn: async (id: string) => {
            const r = await revokeKey(id)
            if (!r.success) throw new Error(r.error ?? "The key could not be revoked.")
        },
        onSuccess: async () => {
            toast.success("Key revoked")
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: PLATFORM_KEYS.keys }),
                queryClient.invalidateQueries({ queryKey: PLATFORM_KEYS.home }),
            ])
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "The key could not be revoked."),
    })

    const activeCount = keys.filter((k) => !k.revokedAt).length
    const atLimit = activeCount >= MAX_API_KEYS
    const limitReason = `You have ${MAX_API_KEYS} active keys, the most allowed. Revoke one to create another.`

    async function copyPrefix(prefix: string) {
        try {
            await navigator.clipboard.writeText(prefix)
            toast.success("Prefix copied")
        } catch {
            toast.error("Copying is blocked in this browser.")
        }
    }

    return (
        <Page
            title={KEYS_TITLE}
            description={KEYS_DESCRIPTION}
            actions={[{
                key: "create",
                label: "Create API key",
                icon: <Plus className="h-3.5 w-3.5" />,
                primary: true,
                disabled: atLimit,
                title: atLimit ? limitReason : undefined,
                onClick: () => setCreateOpen(true),
            }]}
        >
            <div className="flex min-w-0 flex-col gap-4 pb-6">
                <section className="flex min-w-0 flex-col gap-2 rounded-2xl border border-neutral-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800 dark:bg-neutral-900">
                    <p className="min-w-0 text-sm text-neutral-700 dark:text-neutral-300">
                        Send the key as <code className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-xs dark:bg-neutral-800">Authorization: Bearer &lt;key&gt;</code> to{" "}
                        <code className="break-all rounded bg-neutral-100 px-1 py-0.5 font-mono text-xs dark:bg-neutral-800">{SITE.url}{API_PATHS.chatCompletions}</code>
                    </p>
                    <AppLink href={ROUTES.doc("quickstart")} className="inline-flex shrink-0 cursor-pointer items-center gap-1 text-sm font-medium text-boli-blue hover:underline dark:text-blue-300">
                        Quickstart <ArrowRight className="h-3.5 w-3.5" />
                    </AppLink>
                </section>

                {atLimit ? <p className="text-xs text-neutral-600 dark:text-neutral-400">{limitReason}</p> : null}

                {keys.length === 0 ? (
                    <EmptyState
                        bordered
                        icon={<KeyRound />}
                        title="No API keys yet"
                        description="Create a key to call the Boli API from your own app. The key is shown once - keep it in your .env, never in code."
                        action={
                            <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
                                <Plus className="h-3.5 w-3.5" /> Create API key
                            </Button>
                        }
                    />
                ) : (
                    <section className="min-w-0 overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                        <ScrollArea orientation="both" className="min-w-0" viewportClassName="max-h-[44rem]">
                            <div className="min-w-[46rem]">
                                <Table scroller="parent">
                                    <TableHeader sticky>
                                        <TableRow>
                                            <TableHead className="pl-4">Name</TableHead>
                                            <TableHead>Key</TableHead>
                                            <TableHead>Created</TableHead>
                                            <TableHead>Last used</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead pin="end" className="pr-4 text-right"><span className="sr-only">Actions</span></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {keys.map((k) => {
                                            const revoked = !!k.revokedAt
                                            return (
                                                <TableRow key={k.id} className="h-16">
                                                    <TableCell className="max-w-[16rem] pl-4">
                                                        <span className={cn("flex min-w-0 items-center gap-2.5", revoked && "text-neutral-500")}>
                                                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                                                                <KeyRound className="h-4 w-4" />
                                                            </span>
                                                            <span className="truncate font-medium">{k.name}</span>
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="inline-flex rounded-full bg-neutral-100 px-2.5 py-1 font-mono text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                                                            {maskKey(k.prefix)}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="whitespace-nowrap text-neutral-700 dark:text-neutral-300">{formatDay(k.createdAt)}</TableCell>
                                                    <TableCell className="whitespace-nowrap text-neutral-700 dark:text-neutral-300">
                                                        {k.lastUsedAt ? <RelativeTime value={k.lastUsedAt} timeZone={TIME_ZONE} /> : "-"}
                                                    </TableCell>
                                                    <TableCell>
                                                        {revoked
                                                            ? <Badge variant="outline" className="whitespace-nowrap">Revoked {formatDay(k.revokedAt)}</Badge>
                                                            : <span className="text-sm text-neutral-700 dark:text-neutral-300">Active</span>}
                                                    </TableCell>
                                                    <TableCell pin="end" className="pr-4">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button type="button" variant="ghost" size="icon" aria-label={`Copy the prefix of ${k.name}`} title="Copy prefix" onClick={() => void copyPrefix(k.prefix)}>
                                                                <Copy className="h-4 w-4" />
                                                            </Button>
                                                            {revoked ? null : (
                                                                <ConfirmPopover
                                                                    title={`Revoke "${k.name}"?`}
                                                                    description="Apps using this key stop working at once. This cannot be undone."
                                                                    confirmLabel="Revoke"
                                                                    onConfirm={() => revoke.mutateAsync(k.id)}
                                                                >
                                                                    <Button type="button" variant="outline" size="sm" disabled={revoke.isPending && revoke.variables === k.id}>
                                                                        Revoke
                                                                    </Button>
                                                                </ConfirmPopover>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </ScrollArea>
                    </section>
                )}
            </div>

            <CreateKeyDialog
                open={createOpen}
                onOpenChange={setCreateOpen}
                atLimit={atLimit}
                limitReason={limitReason}
                onCreated={async () => {
                    await Promise.all([
                        queryClient.invalidateQueries({ queryKey: PLATFORM_KEYS.keys }),
                        queryClient.invalidateQueries({ queryKey: PLATFORM_KEYS.home }),
                    ])
                }}
            />
        </Page>
    )
}
