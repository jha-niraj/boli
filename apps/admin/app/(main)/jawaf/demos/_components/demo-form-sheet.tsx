"use client"

import * as React from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus } from "lucide-react"
import { JAWAF_BUSINESS_TYPES, JAWAF_SECTORS, jawafBusinessTypeOptions, jawafSectorOptions, type JawafBusinessType } from "@repo/boli/jawaf"
import { canonicalNepalCity, nepalCityOptions } from "@repo/core/geo/nepal"
import { Button } from "@repo/ui/components/ui/button"
import { ComboSelect } from "@repo/ui/components/ui/combo-select"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { InlineNote } from "@repo/ui/components/ui/inline-note"
import { Input } from "@repo/ui/components/ui/input"
import { Label } from "@repo/ui/components/ui/label"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@repo/ui/components/ui/sheet"
import { toast } from "@repo/ui/components/ui/toast"
import { createJawafDemo } from "@/actions/jawaf/demos.action"
import type { DemoPrefill } from "@/types/jawaf"
import { JAWAF_KEYS } from "../../_components/jawaf-bits"
import { CityPlace } from "./city-place"

interface FormState {
    business: string
    website: string
    businessType: JawafBusinessType
    contactName: string
    phone: string
    email: string
    city: string
    sector: string
    ownerUserId: string
}

const EMPTY: FormState = { business: "", website: "", businessType: "other", contactName: "", phone: "", email: "", city: "", sector: "", ownerUserId: "" }
const ME = "me"
const TYPE_OPTIONS = jawafBusinessTypeOptions()
const CITY_OPTIONS = nepalCityOptions()
const SECTOR_OPTIONS = jawafSectorOptions()

function fromPrefill(p: DemoPrefill | null): FormState {
    if (!p) return EMPTY
    const businessType = (JAWAF_BUSINESS_TYPES as readonly string[]).includes(p.businessType) ? (p.businessType as JawafBusinessType) : "other"
    return { ...EMPTY, business: p.business, website: p.website, businessType, contactName: p.contactName, phone: p.phone, email: p.email, city: canonicalNepalCity(p.city), sector: p.sector }
}

/**
 * New demo: the prospect and its bot in Boli Demos. Pre-filled from a Jawaf pilot request: the page reads
 * ?new=1&from=<contactMessageId> on the server and passes `prefill` (no fetch here).
 * After Create the demo's sheet opens; reading the website happens when the bot is opened in Jawaf (setup: pick pages).
 */
export function DemoFormSheet({ open, onOpenChange, prefill, owners, onCreated }: {
    open: boolean
    onOpenChange: (open: boolean) => void
    prefill: DemoPrefill | null
    owners: { userId: string; name: string; email: string }[]
    onCreated: (prospectId: string) => void
}) {
    const queryClient = useQueryClient()
    const [f, setF] = React.useState<FormState>(() => fromPrefill(prefill))
    const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((cur) => ({ ...cur, [k]: v }))
    const fromMessageId = prefill?.sourceContactMessageId ?? null
    // A new prefill (or none) while the sheet is closed: start from it on the next open.
    const [seenPrefill, setSeenPrefill] = React.useState(prefill)
    if (seenPrefill !== prefill) { setSeenPrefill(prefill); setF(fromPrefill(prefill)) }

    const create = useMutation({
        mutationFn: async () => {
            const r = await createJawafDemo({
                business: f.business, website: f.website || undefined, businessType: f.businessType, contactName: f.contactName || undefined, phone: f.phone || undefined,
                email: f.email || undefined, city: f.city || undefined, sector: f.sector || undefined, ownerUserId: f.ownerUserId && f.ownerUserId !== ME ? f.ownerUserId : undefined,
                sourceContactMessageId: fromMessageId ?? undefined,
            })
            if (!r.success) throw new Error(r.error ?? "The demo could not be created")
            return r.data
        },
        onSuccess: async (row) => {
            toast.success(`Demo created for ${row.business}`)
            await queryClient.invalidateQueries({ queryKey: JAWAF_KEYS.all })
            onCreated(row.id)
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "The demo could not be created"),
    })

    const valid = f.business.trim().length >= 2
    const ownerOptions = React.useMemo(() => [{ value: ME, label: "Me" }, ...owners.map((o) => ({ value: o.userId, label: o.name || o.email, hint: o.name ? o.email : undefined }))], [owners])
    // A listed sector suggests its business type while the type is still "Something else".
    const onSector = (v: string) => setF((cur) => {
        const type = JAWAF_SECTORS.find((s) => s.label === v)?.type
        return { ...cur, sector: v, businessType: cur.businessType === "other" && type ? type : cur.businessType }
    })

    return (
        <Sheet open={open} onOpenChange={onOpenChange} onExitComplete={() => setF(fromPrefill(null))}>
            <SheetContent side="right" className="flex w-full flex-col gap-4">
                <SheetHeader>
                    <SheetTitle>New demo</SheetTitle>
                    <SheetDescription>{fromMessageId ? "From a Jawaf pilot request. Check the details, then create." : "The business and who we talk to. The bot is made in Boli Demos."}</SheetDescription>
                </SheetHeader>
                <form className="flex min-h-0 flex-1 flex-col gap-4" onSubmit={(e) => { e.preventDefault(); if (valid && !create.isPending) create.mutate() }}>
                    <ScrollArea orientation="vertical" className="-mx-6 min-h-0 flex-1">
                        <div className="flex min-w-0 flex-col gap-4 px-6 pb-2">
                            <Text id="d-business" label="Business" value={f.business} onChange={(v) => set("business", v)} placeholder="Gurukul HQ" required />
                            <Text id="d-website" label="Website" value={f.website} onChange={(v) => set("website", v)} placeholder="gurukulhq.com" />
                            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                                <div className="flex min-w-0 flex-col gap-1.5">
                                    <Label htmlFor="d-type">Type</Label>
                                    <ComboSelect id="d-type" value={f.businessType} onValueChange={(v) => set("businessType", v as JawafBusinessType)} options={TYPE_OPTIONS}
                                        searchPlaceholder="Search types" emptyMessage="No type matches" />
                                </div>
                                <div className="flex min-w-0 flex-col gap-1.5">
                                    <Label htmlFor="d-sector">Sector</Label>
                                    <ComboSelect id="d-sector" value={f.sector} onValueChange={onSector} options={SECTOR_OPTIONS} allowOther otherMaxLength={80}
                                        placeholder="Choose a sector" searchPlaceholder="Search sectors" emptyMessage="No sector matches" otherPlaceholder="School software" />
                                </div>
                            </div>
                            <div className="flex min-w-0 flex-col gap-1.5">
                                <Label htmlFor="d-city">City</Label>
                                <ComboSelect id="d-city" value={f.city} onValueChange={(v) => set("city", v)} options={CITY_OPTIONS} allowOther otherMaxLength={80}
                                    placeholder="Choose a city" searchPlaceholder="Search cities or districts" emptyMessage="No city matches" otherPlaceholder="Town, district (Birtamod, Jhapa)" />
                                <CityPlace city={f.city} />
                            </div>
                            <Text id="d-contact" label="Contact person" value={f.contactName} onChange={(v) => set("contactName", v)} />
                            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                                <Text id="d-phone" label="Phone" value={f.phone} onChange={(v) => set("phone", v)} placeholder="98XXXXXXXX" />
                                <Text id="d-email" label="Email" type="email" value={f.email} onChange={(v) => set("email", v)} />
                            </div>
                            <div className="flex min-w-0 flex-col gap-1.5">
                                <Label htmlFor="d-owner">Owner</Label>
                                <ComboSelect id="d-owner" value={f.ownerUserId || ME} onValueChange={(v) => set("ownerUserId", v)} options={ownerOptions}
                                    searchPlaceholder="Search admins" emptyMessage="No admin matches" />
                            </div>
                            <InlineNote>Then open the bot in Jawaf to pick its pages, read them and review the drafted facts. The demo page works as soon as it has knowledge.</InlineNote>
                        </div>
                    </ScrollArea>
                    <SheetFooter>
                        <Button type="button" variant="outline" className="cursor-pointer rounded-xl" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={!valid || create.isPending} className="cursor-pointer gap-2 rounded-xl">
                            {create.isPending ? <InlineLoader size={14} label="Creating" /> : <Plus className="h-4 w-4" />}
                            Create demo
                        </Button>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    )
}

function Text({ id, label, value, onChange, placeholder, type = "text", required }: { id: string; label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; required?: boolean }) {
    return (
        <div className="flex min-w-0 flex-col gap-1.5">
            <Label htmlFor={id}>{label}</Label>
            <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-9 rounded-xl" required={required} />
        </div>
    )
}
