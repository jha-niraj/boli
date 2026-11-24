"use client"

import * as React from "react"
import { ChevronRight, Plus } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { ConfirmPopover } from "@repo/ui/components/ui/confirm-popover"
import { Input } from "@repo/ui/components/ui/input"
import { Label } from "@repo/ui/components/ui/label"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@repo/ui/components/ui/sheet"
import { SortableList } from "@repo/ui/components/sortable-list"
import { Switch } from "@repo/ui/components/ui/switch"
import { cn } from "@repo/ui/lib/utils"
import { InlineLoader } from "@repo/brand/loaders/spinners"
import { JAWAF_BUILTIN_FIELDS, JAWAF_CUSTOM_FIELD_TYPES, JAWAF_LIMITS, type JawafCustomFieldType } from "@repo/boli/jawaf"
import { ChipsInput } from "@/components/jawaf/chips-input"
import { JAWAF_CARD } from "@/components/jawaf/keys"
import type { JawafBot, JawafContactFields, JawafCustomField } from "@/types/jawaf"
import { useSaveBot } from "./use-save-bot"

const BUILTIN: Record<(typeof JAWAF_BUILTIN_FIELDS)[number], { label: string; hint: string; botFills?: boolean }> = {
    name: { label: "Name", hint: "What to call them." },
    phone: { label: "Phone", hint: "A Nepal mobile or landline number." },
    email: { label: "Email", hint: "For people who prefer email." },
    interest: { label: "What they want", hint: "Filled in by Jawaf from the conversation - visitors never type it.", botFills: true },
    preferredTime: { label: "Best time to call", hint: "Morning, afternoon or evening." },
}
const TYPE_LABEL: Record<JawafCustomFieldType, string> = { text: "Text", select: "Choose from a list", number: "Number", date: "Date" }

const newField = (): JawafCustomField => ({ id: `f_${crypto.randomUUID().slice(0, 8)}`, label: "", type: "text", options: [], required: false })

/**
 * Contact fields: what the contact card asks for when Jawaf cannot answer or a visitor wants a call back. Built-in
 * fields are switches; custom fields are a list you drag to reorder (the shared SortableList) and edit in the right
 * sheet (2+ fields per item). Saved together with Save changes.
 */
export function ContactFieldsTab({ bot, canManage }: { bot: JawafBot; canManage: boolean }) {
    const [fields, setFields] = React.useState<JawafContactFields>(bot.contactFields)
    React.useEffect(() => { setFields(bot.contactFields) }, [bot.contactFields])
    const save = useSaveBot(bot.id)
    const [editing, setEditing] = React.useState<JawafCustomField | null>(null)
    const [open, setOpen] = React.useState(false)

    const dirty = JSON.stringify(fields) !== JSON.stringify(bot.contactFields)
    const setBuiltIn = (k: (typeof JAWAF_BUILTIN_FIELDS)[number], patch: Partial<{ enabled: boolean; required: boolean }>) =>
        setFields((f) => ({ ...f, builtIn: { ...f.builtIn, [k]: { ...f.builtIn[k], ...patch, ...(patch.enabled === false ? { required: false } : {}) } } }))
    const upsert = (field: JawafCustomField) => setFields((f) => ({
        ...f,
        custom: f.custom.some((c) => c.id === field.id) ? f.custom.map((c) => (c.id === field.id ? field : c)) : [...f.custom, field],
    }))
    const remove = (id: string) => setFields((f) => ({ ...f, custom: f.custom.filter((c) => c.id !== id) }))

    return (
        <form className="flex min-w-0 flex-col gap-4" onSubmit={(e) => { e.preventDefault(); if (dirty && !save.isPending) save.mutate({ contactFields: fields }) }}>
            <section className={cn(JAWAF_CARD, "flex flex-col p-4 sm:p-5")}>
                <h2 className="text-base font-semibold text-neutral-900 dark:text-white">Built-in fields</h2>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">Jawaf asks only when it helps - after a question it could not answer, or when someone wants a call back. Never before the first question.</p>
                <ul className="mt-3 divide-y divide-neutral-200 dark:divide-neutral-800">
                    {JAWAF_BUILTIN_FIELDS.map((k) => {
                        const f = fields.builtIn[k]
                        const info = BUILTIN[k]
                        return (
                            <li key={k} className="flex min-w-0 items-center gap-3 py-3">
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm text-neutral-900 dark:text-white">{info.label}</p>
                                    <p className="text-xs text-neutral-600 dark:text-neutral-400">{info.hint}</p>
                                </div>
                                {!info.botFills ? (
                                    <label className={cn("flex shrink-0 items-center gap-2 text-xs text-neutral-700 dark:text-neutral-300", !f.enabled && "opacity-50")}>
                                        Required
                                        <Switch checked={f.required} disabled={!canManage || !f.enabled} onCheckedChange={(v) => setBuiltIn(k, { required: v })} aria-label={`${info.label} required`} />
                                    </label>
                                ) : null}
                                <Switch checked={f.enabled} disabled={!canManage} onCheckedChange={(v) => setBuiltIn(k, { enabled: v })} aria-label={`Ask for ${info.label.toLowerCase()}`} />
                            </li>
                        )
                    })}
                </ul>
            </section>

            <section className={cn(JAWAF_CARD, "flex flex-col gap-3 p-4 sm:p-5")}>
                <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h2 className="text-base font-semibold text-neutral-900 dark:text-white">Your own fields</h2>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400">Anything else you need - course of interest, travel date, budget. Drag to set the order.</p>
                    </div>
                    {canManage ? (
                        <Button type="button" variant="outline" size="sm" className="shrink-0 cursor-pointer gap-1.5" data-sheet-keep-open disabled={fields.custom.length >= JAWAF_LIMITS.customFields} onClick={() => { setEditing(newField()); setOpen(true) }}>
                            <Plus className="h-3.5 w-3.5" /> Add field
                        </Button>
                    ) : null}
                </div>
                {fields.custom.length ? (
                    <SortableList
                        items={fields.custom}
                        getId={(f) => f.id}
                        onReorder={(next) => setFields((f) => ({ ...f, custom: next }))}
                        disabled={!canManage}
                        className="flex flex-col gap-2"
                        handleLabel={(f) => `Move ${f.label}`}
                        renderItem={(f, { handle, dragging }) => (
                            <div
                                data-sheet-keep-open
                                onClick={() => { setEditing(f); setOpen(true) }}
                                className={cn(
                                    "flex min-w-0 cursor-pointer items-center gap-2 rounded-xl border border-neutral-200 bg-white px-2 py-2 transition-colors hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700",
                                    dragging && "shadow-lg",
                                    open && editing?.id === f.id && "border-neutral-400 dark:border-neutral-600",
                                )}
                            >
                                <span onClick={(e) => e.stopPropagation()}>{handle}</span>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm text-neutral-900 dark:text-white">{f.label}</p>
                                    <p className="truncate text-xs text-neutral-600 dark:text-neutral-400">
                                        {TYPE_LABEL[f.type]}{f.type === "select" ? ` - ${f.options.length} choices` : ""}{f.required ? " - required" : ""}
                                    </p>
                                </div>
                                <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-neutral-400" />
                            </div>
                        )}
                    />
                ) : (
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">No fields of your own yet.</p>
                )}
            </section>

            {canManage ? (
                <div className="flex items-center justify-end gap-2">
                    {dirty ? <Button type="button" variant="ghost" className="cursor-pointer" onClick={() => setFields(bot.contactFields)}>Discard changes</Button> : null}
                    <Button type="submit" className="cursor-pointer gap-2" disabled={!dirty || save.isPending}>
                        {save.isPending ? <InlineLoader size={14} label="Saving" /> : null} Save changes
                    </Button>
                </div>
            ) : null}

            <CustomFieldSheet
                field={editing}
                isNew={!!editing && !fields.custom.some((c) => c.id === editing.id)}
                open={open}
                onOpenChange={setOpen}
                onExitComplete={() => setEditing(null)}
                canManage={canManage}
                onDone={(f) => { upsert(f); setOpen(false) }}
                onRemove={(id) => { remove(id); setOpen(false) }}
            />
        </form>
    )
}

function CustomFieldSheet({ field, isNew, open, onOpenChange, onExitComplete, canManage, onDone, onRemove }: {
    field: JawafCustomField | null
    isNew: boolean
    open: boolean
    onOpenChange: (o: boolean) => void
    onExitComplete: () => void
    canManage: boolean
    onDone: (f: JawafCustomField) => void
    onRemove: (id: string) => void
}) {
    const [d, setD] = React.useState<JawafCustomField>(newField)
    React.useEffect(() => { if (field) setD(field) }, [field])
    const valid = d.label.trim().length > 0 && (d.type !== "select" || d.options.length > 0)

    return (
        <Sheet open={open} onOpenChange={onOpenChange} onExitComplete={onExitComplete}>
            <SheetContent side="right" className="flex w-full flex-col gap-4 sm:max-w-md">
                <SheetHeader>
                    <SheetTitle>{isNew ? "Add a field" : d.label || "Field"}</SheetTitle>
                    <SheetDescription>Saved with the rest when you press Save changes.</SheetDescription>
                </SheetHeader>
                <div className="flex min-h-0 flex-1 flex-col gap-4">
                    <ScrollArea orientation="vertical" className="-mx-6 min-h-0 flex-1">
                        <div className="flex flex-col gap-4 px-6 pb-2">
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="field-label">Label</Label>
                                <Input id="field-label" value={d.label} onChange={(e) => setD({ ...d, label: e.target.value })} maxLength={60} disabled={!canManage} placeholder="Course of interest" className="h-9 text-sm" />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="field-type">Type</Label>
                                <Select value={d.type} onValueChange={(v) => setD({ ...d, type: v as JawafCustomFieldType })} disabled={!canManage}>
                                    <SelectTrigger id="field-type" className="h-9 w-full cursor-pointer text-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {JAWAF_CUSTOM_FIELD_TYPES.map((t) => <SelectItem key={t} value={t}>{TYPE_LABEL[t]}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            {d.type === "select" ? (
                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="field-options">Choices</Label>
                                    <ChipsInput id="field-options" value={d.options} onChange={(options) => setD({ ...d, options })} max={20} maxLength={60} placeholder="Type a choice, press Enter" disabled={!canManage} />
                                </div>
                            ) : null}
                            <label className="flex items-center justify-between gap-3 text-sm text-neutral-900 dark:text-white">
                                Required
                                <Switch checked={d.required} onCheckedChange={(required) => setD({ ...d, required })} disabled={!canManage} />
                            </label>
                        </div>
                    </ScrollArea>
                    {canManage ? (
                        <SheetFooter>
                            {!isNew && field ? (
                                <ConfirmPopover title="Remove this field?" description="Contacts already saved keep what they typed." confirmLabel="Remove" onConfirm={() => onRemove(field.id)} side="top" align="start">
                                    <Button type="button" variant="ghost" className="mr-auto cursor-pointer text-red-700 dark:text-red-400">Remove</Button>
                                </ConfirmPopover>
                            ) : null}
                            <Button type="button" variant="outline" className="cursor-pointer" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button type="button" className="cursor-pointer" disabled={!valid} onClick={() => onDone({ ...d, label: d.label.trim(), options: d.type === "select" ? d.options : [] })}>
                                {isNew ? "Add field" : "Done"}
                            </Button>
                        </SheetFooter>
                    ) : null}
                </div>
            </SheetContent>
        </Sheet>
    )
}
