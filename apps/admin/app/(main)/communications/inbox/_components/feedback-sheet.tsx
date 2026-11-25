"use client"

import { Check, Mail, RotateCcw } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { PanelRow, PanelRows } from "@repo/ui/components/ui/section-panel"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@repo/ui/components/ui/sheet"
import { fmtDateTime } from "@/components/admin-format"
import type { InboxFeedbackRow } from "@/types/inbox"
import { HandledWord, Stars } from "./inbox-bits"

function feedbackReplyHref(row: InboxFeedbackRow): string | null {
    if (!row.userEmail) return null
    const first = (row.userName ?? "").trim().split(/\s+/)[0] ?? ""
    const subject = "Re: your feedback on Boli"
    const body = `Namaste${first ? ` ${first}` : ""},\n\nThank you for writing to us.\n\n`
    return `mailto:${encodeURIComponent(row.userEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

/** One piece of app feedback in the keep-open sheet: rating, who, where from, the message, handled. */
export function FeedbackSheet({ row, open, onOpenChange, onExitComplete, canWrite, pending, onSetHandled }: {
    row: InboxFeedbackRow | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onExitComplete: () => void
    canWrite: boolean
    pending: boolean
    onSetHandled: (row: InboxFeedbackRow, handled: boolean) => void
}) {
    const reply = row ? feedbackReplyHref(row) : null
    return (
        <Sheet open={open} onOpenChange={onOpenChange} onExitComplete={onExitComplete}>
            <SheetContent side="right" className="flex w-full flex-col gap-4">
                <SheetHeader>
                    <SheetTitle className="truncate">Feedback{row?.page ? ` on ${row.page}` : ""}</SheetTitle>
                    <SheetDescription className="truncate">{row ? (row.userEmail ? `${row.userName || "No name"} - ${row.userEmail}` : "Account deleted") : null}</SheetDescription>
                </SheetHeader>
                {row ? (
                    <ScrollArea orientation="vertical" className="-mx-6 min-h-0 flex-1">
                        <div className="flex min-w-0 flex-col gap-4 px-6 pb-2">
                            <div className="flex flex-wrap items-center gap-3">
                                <Stars rating={row.rating} />
                                <HandledWord handledAt={row.handledAt} />
                            </div>
                            <PanelRows>
                                <PanelRow label="From" valueClassName="truncate">{row.userEmail ?? "Account deleted"}</PanelRow>
                                <PanelRow label="Page" valueClassName="truncate font-mono text-xs">{row.page ?? "-"}</PanelRow>
                                <PanelRow label="Sent">{fmtDateTime(row.createdAt)}</PanelRow>
                                <PanelRow label="Handled">{row.handledAt ? `${fmtDateTime(row.handledAt)}${row.handledByName ? ` by ${row.handledByName}` : ""}` : "Not yet"}</PanelRow>
                            </PanelRows>
                            <section aria-labelledby="inbox-feedback-title" className="min-w-0">
                                <h3 id="inbox-feedback-title" className="text-sm font-semibold text-neutral-900 dark:text-white">Message</h3>
                                <p className="mt-2 whitespace-pre-wrap break-words rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm leading-6 text-neutral-800 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200">
                                    {row.message}
                                </p>
                            </section>
                        </div>
                    </ScrollArea>
                ) : null}
                {row ? (
                    <SheetFooter className="flex-wrap">
                        {reply ? (
                            <Button asChild variant="outline" className="cursor-pointer gap-2 rounded-xl">
                                <a href={reply}>
                                    <Mail className="h-4 w-4" /> Reply by email
                                </a>
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
