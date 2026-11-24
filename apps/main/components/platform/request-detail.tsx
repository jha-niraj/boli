"use client"

import { MessagesSquare } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"
import { Button } from "@repo/ui/components/ui/button"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { PanelRow, PanelRows } from "@repo/ui/components/ui/section-panel"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@repo/ui/components/ui/sheet"
import { formatCredits, maskKey, modelById } from "@repo/boli"
import { ROUTES } from "@/lib/navigation"
import { formatFullDateTime, formatLatency, SOURCE_LABEL } from "@/lib/platform-display"
import type { RequestRow } from "@/types/platform"

/** A request's status as words: "OK", or the error code. */
export function StatusText({ row }: { row: Pick<RequestRow, "status" | "errorCode"> }) {
    if (row.status === "ok") return <span className="text-neutral-700 dark:text-neutral-300">OK</span>
    return <span className="text-rose-700 dark:text-rose-400">{row.errorCode ? `Error - ${row.errorCode}` : "Error"}</span>
}

/** Every stored field of one model call (metadata only - prompts and answers are never stored for API calls). */
export function RequestDetailRows({ row }: { row: RequestRow }) {
    const model = modelById(row.model)
    return (
        <PanelRows>
            <PanelRow label="Time">{formatFullDateTime(row.createdAt)}</PanelRow>
            <PanelRow label="Source">{SOURCE_LABEL[row.source]}</PanelRow>
            {row.source === "api" ? (
                <PanelRow label="API key">
                    {row.keyName ? (
                        <span className="flex min-w-0 items-center gap-2">
                            <span className="truncate">{row.keyName}</span>
                            {row.keyPrefix ? <span className="shrink-0 font-mono text-xs text-neutral-600 dark:text-neutral-400">{maskKey(row.keyPrefix)}</span> : null}
                        </span>
                    ) : "Deleted key"}
                </PanelRow>
            ) : (
                <PanelRow label="Conversation" valueClassName="truncate">{row.conversationTitle ?? (row.conversationId ? "Untitled chat" : "-")}</PanelRow>
            )}
            <PanelRow label="Model">
                <span className="font-mono text-xs">{row.model}</span>
                {model ? <span className="ml-2 text-xs text-neutral-600 dark:text-neutral-400">{model.label}</span> : null}
            </PanelRow>
            <PanelRow label="Input tokens" valueClassName="tabular-nums">{row.inputTokens.toLocaleString("en-US")}</PanelRow>
            <PanelRow label="Output tokens" valueClassName="tabular-nums">{row.outputTokens.toLocaleString("en-US")}</PanelRow>
            <PanelRow label="Thinking tokens" valueClassName="tabular-nums">
                {row.reasoningTokens.toLocaleString("en-US")}
                {row.reasoningTokens > 0 ? <span className="ml-2 text-xs text-neutral-600 dark:text-neutral-400">billed as output</span> : null}
            </PanelRow>
            <PanelRow label="Credits" valueClassName="tabular-nums">{formatCredits(row.costMicro)}</PanelRow>
            <PanelRow label="Latency" valueClassName="tabular-nums">{formatLatency(row.latencyMs)}</PanelRow>
            <PanelRow label="First token" valueClassName="tabular-nums">{row.stream ? formatLatency(row.firstTokenMs) : "Not streamed"}</PanelRow>
            <PanelRow label="Status"><StatusText row={row} /></PanelRow>
            <PanelRow label="Request ID" valueClassName="truncate font-mono text-xs text-neutral-600 dark:text-neutral-400">{row.id}</PanelRow>
        </PanelRows>
    )
}

/**
 * The request detail in the keep-open right sheet. Rows that open it carry `data-sheet-keep-open`, so pressing another
 * row swaps the sheet to that request. The caller clears `row` in `onExitComplete`.
 */
export function RequestSheet({ row, open, onOpenChange, onExitComplete }: {
    row: RequestRow | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onExitComplete?: () => void
}) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange} onExitComplete={onExitComplete}>
            <SheetContent side="right" className="flex w-full flex-col gap-4 sm:max-w-md">
                <SheetHeader>
                    <SheetTitle className="truncate">{row ? `${SOURCE_LABEL[row.source]} request` : "Request"}</SheetTitle>
                    <SheetDescription className="truncate">{row ? formatFullDateTime(row.createdAt) : ""}</SheetDescription>
                </SheetHeader>
                {row ? (
                    <ScrollArea orientation="vertical" className="-mx-6 min-h-0 flex-1">
                        <div className="flex flex-col gap-3 px-6 pb-2">
                            <RequestDetailRows row={row} />
                            {row.source === "api" ? (
                                <p className="text-xs text-neutral-600 dark:text-neutral-400">API calls keep metadata only: the prompt and the answer are never stored.</p>
                            ) : null}
                        </div>
                    </ScrollArea>
                ) : null}
                {row?.source === "kura" && row.conversationId ? (
                    <SheetFooter>
                        <Button asChild size="sm" className="gap-2">
                            <AppLink href={ROUTES.kuraConversation(row.conversationId)}>
                                <MessagesSquare className="h-3.5 w-3.5" /> Open in Kura
                            </AppLink>
                        </Button>
                    </SheetFooter>
                ) : null}
            </SheetContent>
        </Sheet>
    )
}
