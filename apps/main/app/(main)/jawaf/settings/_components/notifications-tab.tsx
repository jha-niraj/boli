"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@repo/ui/components/ui/button"
import { Label } from "@repo/ui/components/ui/label"
import { Switch } from "@repo/ui/components/ui/switch"
import { toast } from "@repo/ui/components/ui/toast"
import { cn } from "@repo/ui/lib/utils"
import { InlineLoader } from "@repo/brand/loaders/spinners"
import { getJawafNotifyPrefs, saveJawafNotifyPrefs } from "@/actions/jawaf/settings.action"
import { ChipsInput } from "@/components/jawaf/chips-input"
import { JAWAF_CARD, JAWAF_KEYS, unwrap } from "@/components/jawaf/keys"
import { JAWAF_NOTIFY_EXTRA_EMAILS } from "@/schemas/jawaf"
import type { JawafNotifyPrefs } from "@/types/jawaf"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function Row({ id, title, hint, checked, onChange, children }: { id: string; title: string; hint: string; checked: boolean; onChange: (v: boolean) => void; children?: React.ReactNode }) {
    return (
        <li className="flex min-w-0 flex-col gap-3 py-3">
            <div className="flex min-w-0 items-center gap-3">
                <div className="min-w-0 flex-1">
                    <Label htmlFor={id} className="text-sm font-normal text-neutral-900 dark:text-white">{title}</Label>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">{hint}</p>
                </div>
                <Switch id={id} checked={checked} onCheckedChange={onChange} />
            </div>
            {children}
        </li>
    )
}

/**
 * Notifications: your own choices for this bot (each person sets theirs). Stored now; the emails, the daily summary,
 * the bell and push start with the Conversations and Contacts update (plan Wave 4).
 */
export function NotificationsTab({ botId, initial }: { botId: string; initial: JawafNotifyPrefs }) {
    const queryClient = useQueryClient()
    const stored = useQuery({ queryKey: JAWAF_KEYS.notify(botId), queryFn: async () => unwrap(await getJawafNotifyPrefs(botId)), initialData: initial }).data ?? initial
    const [d, setD] = React.useState<JawafNotifyPrefs>(stored)
    React.useEffect(() => { setD(stored) }, [stored])
    const set = <K extends keyof JawafNotifyPrefs>(k: K, v: JawafNotifyPrefs[K]) => setD((p) => ({ ...p, [k]: v }))

    const save = useMutation({
        mutationFn: async () => unwrap(await saveJawafNotifyPrefs({ botId, ...d }), "Your choices could not be saved."),
        onSuccess: (saved) => { queryClient.setQueryData(JAWAF_KEYS.notify(botId), saved); toast.success("Saved") },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Your choices could not be saved."),
    })
    const dirty = JSON.stringify(d) !== JSON.stringify(stored)

    return (
        <form className="flex min-w-0 flex-col gap-4" onSubmit={(e) => { e.preventDefault(); if (dirty && !save.isPending) save.mutate() }}>
            <section className={cn(JAWAF_CARD, "flex flex-col p-4 sm:p-5")}>
                <h2 className="text-base font-semibold text-neutral-900 dark:text-white">Tell me when</h2>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">Your own choices for this bot. Others in the workspace set theirs.</p>
                <ul className="mt-2 divide-y divide-neutral-200 dark:divide-neutral-800">
                    <Row id="n-contact" title="Email me at once for a new contact" hint="When a visitor leaves their name and number." checked={d.contactEmail} onChange={(v) => set("contactEmail", v)}>
                        {d.contactEmail ? (
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="n-extra" className="text-xs font-normal text-neutral-700 dark:text-neutral-300">Also send it to</Label>
                                <ChipsInput
                                    id="n-extra"
                                    value={d.extraEmails}
                                    onChange={(v) => set("extraEmails", v)}
                                    max={JAWAF_NOTIFY_EXTRA_EMAILS}
                                    maxLength={200}
                                    placeholder="frontdesk@example.com"
                                    validate={(e) => (EMAIL_RE.test(e) ? null : "Enter a valid email address.")}
                                />
                            </div>
                        ) : null}
                    </Row>
                    <Row id="n-daily" title="Daily summary email" hint="Each evening: questions answered, new contacts and what could not be answered." checked={d.dailySummary} onChange={(v) => set("dailySummary", v)} />
                    <Row id="n-bell" title="The bell" hint="New contacts and unanswered questions in the rail's bell." checked={d.bell} onChange={(v) => set("bell", v)} />
                    <Row id="n-push" title="Browser notifications" hint="A pop-up on this computer or phone, even with Boli closed." checked={d.push} onChange={(v) => set("push", v)} />
                </ul>
            </section>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">Your choices are saved now. Sending starts with the Conversations and Contacts pages.</p>
            <div className="flex items-center justify-end gap-2">
                {dirty ? <Button type="button" variant="ghost" className="cursor-pointer" onClick={() => setD(stored)}>Discard changes</Button> : null}
                <Button type="submit" className="cursor-pointer gap-2" disabled={!dirty || save.isPending}>
                    {save.isPending ? <InlineLoader size={14} label="Saving" /> : null} Save changes
                </Button>
            </div>
        </form>
    )
}
