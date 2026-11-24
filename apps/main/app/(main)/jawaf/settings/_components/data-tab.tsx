"use client"

import * as React from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ArrowRight, Trash2 } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"
import { Button } from "@repo/ui/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@repo/ui/components/ui/dialog"
import { Input } from "@repo/ui/components/ui/input"
import { Label } from "@repo/ui/components/ui/label"
import { Switch } from "@repo/ui/components/ui/switch"
import { toast } from "@repo/ui/components/ui/toast"
import { cn } from "@repo/ui/lib/utils"
import { InlineLoader } from "@repo/brand/loaders/spinners"
import { deleteJawafBot } from "@/actions/jawaf/bots.action"
import { JAWAF_CARD, JAWAF_ROOT, unwrap } from "@/components/jawaf/keys"
import { setCurrentJawafBot } from "@/lib/jawaf/bot-cookie"
import { ROUTES } from "@/lib/navigation"
import type { JawafBot } from "@/types/jawaf"
import { useSaveBot } from "./use-save-bot"

/**
 * Data: show sources on the public page, the training opt-in (off by default, said plainly), a link to the Data page,
 * and deleting the bot - a Dialog (big and irreversible) that asks for the bot's name typed out.
 */
export function DataTab({ bot, canManage }: { bot: JawafBot; canManage: boolean }) {
    const save = useSaveBot(bot.id)
    const [deleteOpen, setDeleteOpen] = React.useState(false)

    return (
        <div className="flex min-w-0 flex-col gap-4">
            <section className={cn(JAWAF_CARD, "flex flex-col p-4 sm:p-5")}>
                <h2 className="text-base font-semibold text-neutral-900 dark:text-white">What visitors see</h2>
                <ul className="mt-2 divide-y divide-neutral-200 dark:divide-neutral-800">
                    <li className="flex min-w-0 items-center gap-3 py-3">
                        <div className="min-w-0 flex-1">
                            <Label htmlFor="d-sources" className="text-sm font-normal text-neutral-900 dark:text-white">Show sources on the public page</Label>
                            <p className="text-xs text-neutral-600 dark:text-neutral-400">Small numbered chips under each answer, linking to the page it came from. The playground always shows them.</p>
                        </div>
                        <Switch id="d-sources" checked={bot.showSources} disabled={!canManage || save.isPending} onCheckedChange={(v) => save.mutate({ showSources: v })} />
                    </li>
                </ul>
            </section>

            <section className={cn(JAWAF_CARD, "flex flex-col p-4 sm:p-5")}>
                <h2 className="text-base font-semibold text-neutral-900 dark:text-white">Your data</h2>
                <ul className="mt-2 divide-y divide-neutral-200 dark:divide-neutral-800">
                    <li className="flex min-w-0 items-start gap-3 py-3">
                        <div className="min-w-0 flex-1">
                            <Label htmlFor="d-training" className="text-sm font-normal text-neutral-900 dark:text-white">Help improve Boli&apos;s models</Label>
                            <p className="text-xs leading-5 text-neutral-600 dark:text-neutral-400">
                                Off unless you turn it on. When on, Boli may use this bot&apos;s conversations to train its own open models, with names, phone numbers and other personal details removed first. Your knowledge (pages, files, facts) is never used. Turn it off any time.
                            </p>
                        </div>
                        <Switch id="d-training" checked={bot.trainingOptIn} disabled={!canManage || save.isPending} onCheckedChange={(v) => save.mutate({ trainingOptIn: v })} />
                    </li>
                    <li className="flex min-w-0 items-center gap-3 py-3">
                        <p className="min-w-0 flex-1 text-xs text-neutral-600 dark:text-neutral-400">Where everything is stored, which models read it, and what deleting removes.</p>
                        <Button asChild variant="outline" size="sm" className="shrink-0 cursor-pointer gap-1.5">
                            <AppLink href={ROUTES.jawafData}>Where your data lives <ArrowRight className="h-3.5 w-3.5" /></AppLink>
                        </Button>
                    </li>
                </ul>
            </section>

            {canManage ? (
                <section className={cn(JAWAF_CARD, "flex min-w-0 flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-5")}>
                    <div className="min-w-0 flex-1">
                        <h2 className="text-base font-semibold text-neutral-900 dark:text-white">Delete this bot</h2>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400">Deletes {bot.name} and everything under it: pages, files, facts, Q&A, notes, conversations and contacts. The public link stops working. This cannot be undone.</p>
                    </div>
                    <Button type="button" variant="outline" className="shrink-0 cursor-pointer gap-1.5 text-red-700 dark:text-red-400" onClick={() => setDeleteOpen(true)}>
                        <Trash2 className="h-3.5 w-3.5" /> Delete bot
                    </Button>
                </section>
            ) : null}

            <DeleteBotDialog bot={bot} open={deleteOpen} onOpenChange={setDeleteOpen} />
        </div>
    )
}

function DeleteBotDialog({ bot, open, onOpenChange }: { bot: JawafBot; open: boolean; onOpenChange: (o: boolean) => void }) {
    const queryClient = useQueryClient()
    const [typed, setTyped] = React.useState("")
    React.useEffect(() => { if (!open) setTyped("") }, [open])
    const remove = useMutation({
        mutationFn: async () => unwrap(await deleteJawafBot(bot.id), "The bot could not be deleted."),
        onSuccess: async () => {
            setCurrentJawafBot(null)
            queryClient.removeQueries({ queryKey: JAWAF_ROOT })
            toast.success(`${bot.name} deleted`)
            // A full load: the shell's switcher and every Jawaf page start again without the bot.
            window.location.assign(ROUTES.jawaf)
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "The bot could not be deleted."),
    })
    const match = typed.trim() === bot.name.trim()

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!remove.isPending) onOpenChange(o) }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Delete {bot.name}?</DialogTitle>
                    <DialogDescription>Everything under this bot is deleted at once and cannot be brought back. Credits already spent are not returned.</DialogDescription>
                </DialogHeader>
                <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); if (match && !remove.isPending) remove.mutate() }}>
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="delete-name">Type <span className="font-semibold">{bot.name}</span> to confirm</Label>
                        <Input id="delete-name" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" className="h-9 text-sm" />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" className="cursor-pointer" onClick={() => onOpenChange(false)} disabled={remove.isPending}>Cancel</Button>
                        <Button type="submit" variant="destructive" className="cursor-pointer gap-2" disabled={!match || remove.isPending}>
                            {remove.isPending ? <InlineLoader size={14} label="Deleting" /> : null} Delete forever
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
