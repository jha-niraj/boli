"use client"

import { Bot, Check, ExternalLink, Mail, RotateCcw } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"
import { Button } from "@repo/ui/components/ui/button"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { PanelRow, PanelRows } from "@repo/ui/components/ui/section-panel"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@repo/ui/components/ui/sheet"
import { fmtDateTime } from "@/components/admin-format"
import { ROUTES } from "@/lib/navigation"
import { INBOX_TOPIC_LABELS, type InboxContactRow } from "@/types/inbox"
import { Pill } from "../../../admins/_components/admin-bits"
import { businessTypeLabel, HandledWord, replyHref } from "./inbox-bits"

/** Where "Create demo" goes: the demo form reads `from` and pre-fills itself from this request (task 2). */
export function createDemoHref(contactMessageId: string): string {
    return `${ROUTES.jawafDemos}?new=1&from=${encodeURIComponent(contactMessageId)}`
}

/**
 * One contact message in the keep-open sheet: who wrote, the pilot fields when it is a Jawaf pilot request, the
 * message, and the footer - Reply by email (mailto with a subject), Create demo (pilot requests), Mark handled.
 */
export function ContactSheet({ row, open, onOpenChange, onExitComplete, canWrite, pending, onSetHandled }: {
    row: InboxContactRow | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onExitComplete: () => void
    canWrite: boolean
    pending: boolean
    onSetHandled: (row: InboxContactRow, handled: boolean) => void
}) {
    const pilot = row?.pilot ?? null
    return (
        <Sheet open={open} onOpenChange={onOpenChange} onExitComplete={onExitComplete}>
            <SheetContent side="right" className="flex w-full flex-col gap-4">
                <SheetHeader>
                    <SheetTitle className="truncate">{row ? (pilot ? pilot.businessName : row.name) : "Message"}</SheetTitle>
                    <SheetDescription className="truncate">
                        {row ? (pilot ? `Jawaf pilot request from ${row.name}` : `${INBOX_TOPIC_LABELS[row.topic ?? ""] ?? row.topic ?? "No topic"} - ${row.email}`) : null}
                    </SheetDescription>
                </SheetHeader>
                {row ? (
                    <ScrollArea orientation="vertical" className="-mx-6 min-h-0 flex-1">
                        <div className="flex min-w-0 flex-col gap-4 px-6 pb-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <Pill>{INBOX_TOPIC_LABELS[row.topic ?? ""] ?? row.topic ?? "No topic"}</Pill>
                                <HandledWord handledAt={row.handledAt} />
                            </div>

                            {pilot ? (
                                <section aria-labelledby="inbox-pilot-title" className="min-w-0">
                                    <h3 id="inbox-pilot-title" className="text-sm font-semibold text-neutral-900 dark:text-white">For the demo</h3>
                                    <PanelRows className="mt-1">
                                        <PanelRow label="Business">{pilot.businessName}</PanelRow>
                                        <PanelRow label="Kind">{businessTypeLabel(row)}</PanelRow>
                                        <PanelRow label="City">{pilot.city || "-"}</PanelRow>
                                        {pilot.sector ? <PanelRow label="Sector">{pilot.sector}</PanelRow> : null}
                                        <PanelRow label="Website" valueClassName="truncate">
                                            {pilot.businessWebsite ? (
                                                <a href={pilot.businessWebsite} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full cursor-pointer items-center gap-1 truncate underline decoration-neutral-300 underline-offset-4 hover:decoration-neutral-500 dark:decoration-neutral-600">
                                                    <span className="truncate">{pilot.businessWebsite.replace(/^https?:\/\//, "")}</span>
                                                    <ExternalLink aria-hidden className="h-3.5 w-3.5 shrink-0" />
                                                </a>
                                            ) : (
                                                "Not given"
                                            )}
                                        </PanelRow>
                                        <PanelRow label="Phone">
                                            {pilot.phone ? <a href={`tel:${pilot.phone}`} className="cursor-pointer tabular-nums underline decoration-neutral-300 underline-offset-4 dark:decoration-neutral-600">{pilot.phone}</a> : "Not given"}
                                        </PanelRow>
                                    </PanelRows>
                                </section>
                            ) : null}

                            <section aria-labelledby="inbox-from-title" className="min-w-0">
                                <h3 id="inbox-from-title" className="text-sm font-semibold text-neutral-900 dark:text-white">From</h3>
                                <PanelRows className="mt-1">
                                    <PanelRow label="Name">{row.name}</PanelRow>
                                    <PanelRow label="Email" valueClassName="truncate">{row.email}</PanelRow>
                                    <PanelRow label="Sent">{fmtDateTime(row.createdAt)}</PanelRow>
                                    <PanelRow label="Handled">{row.handledAt ? `${fmtDateTime(row.handledAt)}${row.handledByName ? ` by ${row.handledByName}` : ""}` : "Not yet"}</PanelRow>
                                </PanelRows>
                            </section>

                            <section aria-labelledby="inbox-message-title" className="min-w-0">
                                <h3 id="inbox-message-title" className="text-sm font-semibold text-neutral-900 dark:text-white">Message</h3>
                                <p className="mt-2 whitespace-pre-wrap break-words rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm leading-6 text-neutral-800 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200">
                                    {row.message}
                                </p>
                            </section>
                        </div>
                    </ScrollArea>
                ) : null}
                {row ? (
                    <SheetFooter className="flex-wrap">
                        <Button asChild variant="outline" className="cursor-pointer gap-2 rounded-xl">
                            <a href={replyHref(row)}>
                                <Mail className="h-4 w-4" /> Reply by email
                            </a>
                        </Button>
                        {pilot ? (
                            <Button asChild variant="outline" className="cursor-pointer gap-2 rounded-xl">
                                <AppLink href={createDemoHref(row.id)}>
                                    <Bot className="h-4 w-4" /> Create demo
                                </AppLink>
                            </Button>
                        ) : null}
                        {canWrite ? (
                            <Button type="button" className="cursor-pointer gap-2 rounded-xl" disabled={pending} variant={row.handledAt ? "outline" : "default"}
                                onClick={() => onSetHandled(row, !row.handledAt)}>
                                {pending ? <InlineLoader size={14} label="Saving" /> : row.handledAt ? <RotateCcw className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                                {row.handledAt ? "Mark not handled" : "Mark handled"}
                            </Button>
                        ) : null}
                    </SheetFooter>
                ) : null}
            </SheetContent>
        </Sheet>
    )
}
