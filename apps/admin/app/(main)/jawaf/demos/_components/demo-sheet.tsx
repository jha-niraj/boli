"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, Save } from "lucide-react"
import { JAWAF_CHANNEL_LABELS, jawafBusinessTypeOptions, jawafSectorOptions, type JawafBusinessType } from "@repo/boli/jawaf"
import { canonicalNepalCity, nepalCityOptions } from "@repo/core/geo/nepal"
import { AppLink } from "@repo/ui/components/app-link"
import { Button } from "@repo/ui/components/ui/button"
import { ComboSelect } from "@repo/ui/components/ui/combo-select"
import { DatePicker } from "@repo/ui/components/ui/date-picker"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { Input } from "@repo/ui/components/ui/input"
import { Label } from "@repo/ui/components/ui/label"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@repo/ui/components/ui/sheet"
import { Skeleton } from "@repo/ui/components/ui/skeleton"
import { Textarea } from "@repo/ui/components/ui/textarea"
import { toast } from "@repo/ui/components/ui/toast"
import { cn } from "@repo/ui/lib/utils"
import { getJawafDemo, updateJawafProspect } from "@/actions/jawaf/demos.action"
import { ROUTES } from "@/lib/navigation"
import { PROSPECT_STAGE_LABELS, PROSPECT_STAGES, type ClaimView, type DemoDetail, type ProspectStage } from "@/types/jawaf"
import { dayKey, fmtDate, JAWAF_KEYS, SectionTitle } from "../../_components/jawaf-bits"
import { CityPlace } from "./city-place"
import { DemoBotPanel } from "./demo-bot-panel"

const TYPE_OPTIONS = jawafBusinessTypeOptions()
const CITY_OPTIONS = nepalCityOptions()
const SECTOR_OPTIONS = jawafSectorOptions()

/**
 * One demo in the non-modal right sheet (swaps when another row is pressed): the prospect's details edited in place
 * (Save in the footer), the bot and its tools, the claim timeline, the latest visitor conversations (each opens
 * /jawaf/conversations/<id>).
 */
export function DemoSheet({ prospectId, open, onOpenChange, onExitComplete, owners, mainUrl, canWrite }: {
    prospectId: string | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onExitComplete: () => void
    owners: { userId: string; name: string; email: string }[]
    mainUrl: string
    canWrite: boolean
}) {
    const detail = useQuery({
        queryKey: JAWAF_KEYS.demo(prospectId ?? ""),
        queryFn: async () => {
            const r = await getJawafDemo(prospectId!)
            if (!r.success) throw new Error(r.error ?? "Could not load the demo")
            return r.data
        },
        enabled: open && !!prospectId,
    })
    const d = detail.data
    return (
        <Sheet open={open} onOpenChange={onOpenChange} onExitComplete={onExitComplete}>
            <SheetContent side="right" className="flex w-full flex-col gap-4 sm:max-w-[38rem]">
                <SheetHeader>
                    <SheetTitle className="truncate">{d?.prospect.business ?? "Demo"}</SheetTitle>
                    <SheetDescription className="truncate">{d ? (d.prospect.website ?? "No website") : "Loading"}</SheetDescription>
                </SheetHeader>
                {d && d.prospect.id === prospectId ? (
                    <DemoBody key={d.prospect.id} d={d} owners={owners} mainUrl={mainUrl} canWrite={canWrite} onClose={() => onOpenChange(false)} />
                ) : detail.isError ? (
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">{detail.error instanceof Error ? detail.error.message : "Could not load the demo."}</p>
                ) : (
                    <div className="flex flex-col gap-3">{Array.from({ length: 7 }, (_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>
                )}
            </SheetContent>
        </Sheet>
    )
}

function DemoBody({ d, owners, mainUrl, canWrite, onClose }: { d: DemoDetail; owners: { userId: string; name: string; email: string }[]; mainUrl: string; canWrite: boolean; onClose: () => void }) {
    const queryClient = useQueryClient()
    const p = d.prospect
    const initial = React.useMemo(() => ({
        business: p.business, website: p.website ?? "", businessType: p.businessType, sector: p.sector ?? "", city: canonicalNepalCity(p.city ?? ""), contactName: p.contactName ?? "",
        phone: p.phone ?? "", email: p.email ?? "", stage: p.stage, nextStepAt: dayKey(p.nextStepAt), ownerUserId: p.ownerUserId ?? "", notes: p.notes,
    }), [p])
    const [f, setF] = React.useState(initial)
    const set = <K extends keyof typeof initial>(k: K, v: (typeof initial)[K]) => setF((cur) => ({ ...cur, [k]: v }))
    const dirty = (Object.keys(initial) as (keyof typeof initial)[]).some((k) => initial[k] !== f[k])
    const ownerOptions = React.useMemo(() => [{ value: "none", label: "Nobody yet" }, ...owners.map((o) => ({ value: o.userId, label: o.name || o.email, hint: o.name ? o.email : undefined }))], [owners])

    const save = useMutation({
        mutationFn: async () => {
            const r = await updateJawafProspect({
                // Empty strings clear a field (the schema turns "" into null).
                id: p.id, business: f.business, website: f.website, businessType: f.businessType, sector: f.sector, city: f.city,
                contactName: f.contactName, phone: f.phone, email: f.email, stage: f.stage, nextStepAt: f.nextStepAt,
                ownerUserId: f.ownerUserId, notes: f.notes,
            })
            if (!r.success) throw new Error(r.error ?? "The changes could not be saved")
            return r.data
        },
        onSuccess: async () => {
            toast.success("Saved")
            await queryClient.invalidateQueries({ queryKey: JAWAF_KEYS.all })
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "The changes could not be saved"),
    })

    return (
        <form className="flex min-h-0 flex-1 flex-col gap-4" onSubmit={(e) => { e.preventDefault(); if (dirty && canWrite && !save.isPending) save.mutate() }}>
            <ScrollArea orientation="vertical" className="-mx-6 min-h-0 flex-1">
                <div className="flex min-w-0 flex-col gap-6 px-6 pb-2">
                    <section className="flex min-w-0 flex-col gap-3">
                        <SectionTitle>Where it stands</SectionTitle>
                        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                            <div className="flex min-w-0 flex-col gap-1.5">
                                <Label htmlFor="p-stage">Stage</Label>
                                <Select value={f.stage} onValueChange={(v) => set("stage", v as ProspectStage)} disabled={!canWrite}>
                                    <SelectTrigger id="p-stage" className="w-full cursor-pointer rounded-xl"><SelectValue /></SelectTrigger>
                                    <SelectContent emptyMessage="No stages">
                                        {PROSPECT_STAGES.map((s) => <SelectItem key={s} value={s} className="cursor-pointer">{PROSPECT_STAGE_LABELS[s]}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex min-w-0 flex-col gap-1.5">
                                <Label>Next step</Label>
                                <DatePicker value={f.nextStepAt} onChange={(v) => set("nextStepAt", v)} />
                            </div>
                        </div>
                        <div className="flex min-w-0 flex-col gap-1.5">
                            <Label htmlFor="p-owner">Owner</Label>
                            <ComboSelect id="p-owner" value={f.ownerUserId || "none"} onValueChange={(v) => set("ownerUserId", v === "none" ? "" : v)} options={ownerOptions}
                                disabled={!canWrite} searchPlaceholder="Search admins" emptyMessage="No admin matches" />
                        </div>
                        <div className="flex min-w-0 flex-col gap-1.5">
                            <Label htmlFor="p-notes">Notes</Label>
                            <Textarea id="p-notes" value={f.notes} onChange={(e) => set("notes", e.target.value)} maxLength={5000} disabled={!canWrite}
                                placeholder="What they said, what they want next" className="field-sizing-content min-h-20 rounded-xl text-sm" />
                        </div>
                    </section>

                    <section className="flex min-w-0 flex-col gap-3">
                        <SectionTitle>Who we talk to</SectionTitle>
                        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                            <TextField id="p-contact" label="Contact person" value={f.contactName} onChange={(v) => set("contactName", v)} disabled={!canWrite} />
                            <TextField id="p-phone" label="Phone" value={f.phone} onChange={(v) => set("phone", v)} disabled={!canWrite} />
                            <TextField id="p-email" label="Email" value={f.email} onChange={(v) => set("email", v)} disabled={!canWrite} />
                            <div className="flex min-w-0 flex-col gap-1.5">
                                <Label htmlFor="p-city">City</Label>
                                <ComboSelect id="p-city" value={f.city} onValueChange={(v) => set("city", v)} options={CITY_OPTIONS} allowOther otherMaxLength={80} disabled={!canWrite}
                                    placeholder="Choose a city" searchPlaceholder="Search cities or districts" emptyMessage="No city matches" otherPlaceholder="Town, district (Birtamod, Jhapa)" />
                                <CityPlace city={f.city} />
                            </div>
                            <TextField id="p-business" label="Business" value={f.business} onChange={(v) => set("business", v)} disabled={!canWrite} />
                            <div className="flex min-w-0 flex-col gap-1.5">
                                <Label htmlFor="p-sector">Sector</Label>
                                <ComboSelect id="p-sector" value={f.sector} onValueChange={(v) => set("sector", v)} options={SECTOR_OPTIONS} allowOther otherMaxLength={80} disabled={!canWrite}
                                    placeholder="Choose a sector" searchPlaceholder="Search sectors" emptyMessage="No sector matches" otherPlaceholder="School software" />
                            </div>
                            <TextField id="p-website" label="Website" value={f.website} onChange={(v) => set("website", v)} disabled={!canWrite} />
                            <div className="flex min-w-0 flex-col gap-1.5">
                                <Label htmlFor="p-type">Type</Label>
                                <ComboSelect id="p-type" value={f.businessType} onValueChange={(v) => set("businessType", v as JawafBusinessType)} options={TYPE_OPTIONS}
                                    disabled={!canWrite} searchPlaceholder="Search types" emptyMessage="No type matches" />
                            </div>
                        </div>
                    </section>

                    {p.bot ? <DemoBotPanel prospect={p} bot={p.bot} mainUrl={mainUrl} canWrite={canWrite} /> : (
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">This demo has no bot any more (it was deleted).</p>
                    )}

                    <ClaimTimeline claims={d.claims} />

                    <section className="flex min-w-0 flex-col gap-2">
                        <SectionTitle>Recent conversations</SectionTitle>
                        {d.conversations.length ? (
                            <ul className="flex min-w-0 flex-col divide-y divide-neutral-200 dark:divide-neutral-800">
                                {d.conversations.map((c) => (
                                    <li key={c.id} className="min-w-0">
                                        <AppLink href={ROUTES.jawafConversation(c.id)} className="flex min-w-0 cursor-pointer items-center gap-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-sm text-neutral-900 dark:text-white">{c.firstQuestion ?? "No question yet"}</span>
                                                <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">
                                                    {JAWAF_CHANNEL_LABELS[c.channel]} - {Math.round(c.messageCount / 2)} questions{c.contactCaptured ? " - left contact details" : ""}
                                                </span>
                                            </span>
                                            <span className="shrink-0 text-xs text-neutral-500 dark:text-neutral-400">{fmtDate(c.lastAt, true)}</span>
                                        </AppLink>
                                    </li>
                                ))}
                            </ul>
                        ) : <p className="text-sm text-neutral-600 dark:text-neutral-400">Nobody has asked the demo anything yet.</p>}
                    </section>
                </div>
            </ScrollArea>
            <SheetFooter>
                <Button type="button" variant="outline" className="cursor-pointer rounded-xl" onClick={onClose}>Close</Button>
                {canWrite ? (
                    <Button type="submit" disabled={!dirty || save.isPending} className="cursor-pointer gap-2 rounded-xl">
                        {save.isPending ? <InlineLoader size={14} label="Saving" /> : <Save className="h-4 w-4" />}
                        Save changes
                    </Button>
                ) : null}
            </SheetFooter>
        </form>
    )
}

function TextField({ id, label, value, onChange, disabled }: { id: string; label: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
    return (
        <div className="flex min-w-0 flex-col gap-1.5">
            <Label htmlFor={id}>{label}</Label>
            <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="h-9 rounded-xl" />
        </div>
    )
}

/** The newest claim link's steps: made, sent, opened, claimed (older links are counted, not listed). */
function ClaimTimeline({ claims }: { claims: ClaimView[] }) {
    const c = claims.find((x) => x.status === "claimed") ?? claims[0]
    if (!c) {
        return (
            <section className="flex min-w-0 flex-col gap-2">
                <SectionTitle>Claim</SectionTitle>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">No claim link yet. Make one above when the business is ready.</p>
            </section>
        )
    }
    const steps = [
        { label: "Link made", at: c.createdAt, note: c.createdByName ? `by ${c.createdByName}` : null },
        { label: "Sent", at: c.sentAt, note: c.sentToEmail },
        { label: "Link opened", at: c.linkOpenedAt, note: null },
        { label: "Claimed", at: c.claimedAt, note: c.claimedWorkspaceName ? `into ${c.claimedWorkspaceName}` : null },
    ]
    const ended = c.status === "expired" ? `Expired ${fmtDate(c.expiresAt)}` : c.status === "revoked" ? `Replaced or revoked ${fmtDate(c.revokedAt)}` : c.status === "open" ? `Works until ${fmtDate(c.expiresAt)}` : null
    return (
        <section className="flex min-w-0 flex-col gap-2">
            <SectionTitle>Claim</SectionTitle>
            <ol className="flex min-w-0 flex-col">
                {steps.map((s, i) => (
                    <li key={s.label} className="relative flex min-w-0 gap-3 pb-3 last:pb-0">
                        {i < steps.length - 1 ? <span aria-hidden className="absolute left-[9px] top-5 h-[calc(100%-1rem)] w-px bg-neutral-200 dark:bg-neutral-800" /> : null}
                        <span aria-hidden className={cn("mt-0.5 flex size-[19px] shrink-0 items-center justify-center rounded-full border", s.at ? "border-boli-sky bg-boli-sky text-white" : "border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-900")}>
                            {s.at ? <Check className="size-3" /> : null}
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block text-sm text-neutral-900 dark:text-white">{s.label}</span>
                            <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">{s.at ? `${fmtDate(s.at, true)}${s.note ? ` - ${s.note}` : ""}` : "Not yet"}</span>
                        </span>
                    </li>
                ))}
            </ol>
            {ended ? <p className="text-xs text-neutral-600 dark:text-neutral-400">{ended}{claims.length > 1 ? ` - ${claims.length - 1} older link${claims.length > 2 ? "s" : ""}` : ""}</p> : null}
        </section>
    )
}
