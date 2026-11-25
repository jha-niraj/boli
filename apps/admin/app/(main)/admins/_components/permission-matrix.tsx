"use client"

import { Checkbox } from "@repo/ui/components/ui/checkbox"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/ui/table"
import {
    ADMIN_MODULES, PERMISSION_LEVELS, type AdminPermissions, type PermissionLevel,
} from "@/lib/permissions"

const LEVEL_LABEL: Record<PermissionLevel, string> = { read: "View", write: "Edit", delete: "Delete", full: "Full" }

/** The strongest level held on one module, as a word ("Full", "Edit", "View") or "-" for none. */
export function levelSummary(levels: readonly string[] | undefined): string {
    if (!levels || levels.length === 0) return "-"
    if (levels.includes("full")) return "Full"
    if (levels.includes("delete")) return "Delete"
    if (levels.includes("write")) return "Edit"
    if (levels.includes("read")) return "View"
    return "-"
}

/**
 * Modules down the side, levels across. `allGranted` for a super admin (who holds everything), `readOnly` for a viewer
 * without edit rights. A plain table in a horizontal ScrollArea - four checkboxes a row read better than a grid here.
 */
export function PermissionMatrix({ value, onChange, readOnly = false, allGranted = false }: {
    value: AdminPermissions
    onChange?: (next: AdminPermissions) => void
    readOnly?: boolean
    /** A super admin: every box shown ticked, none editable. */
    allGranted?: boolean
}) {
    const toggle = (module: string, level: PermissionLevel, on: boolean) => {
        const current = new Set<string>(value[module] ?? [])
        if (on) current.add(level)
        else current.delete(level)
        onChange?.({ ...value, [module]: Array.from(current) })
    }
    return (
        <ScrollArea orientation="horizontal" className="rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <div className="min-w-[30rem] [&_td:first-child]:pl-4 [&_th:first-child]:pl-4 [&_td:last-child]:pr-4 [&_th:last-child]:pr-4">
                <Table scroller="parent">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[40%]">Area</TableHead>
                            {PERMISSION_LEVELS.map((l) => (
                                <TableHead key={l} className="text-center">{LEVEL_LABEL[l]}</TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {ADMIN_MODULES.map((m) => (
                            <TableRow key={m.id}>
                                <TableCell>
                                    <p className="text-sm font-medium text-neutral-900 dark:text-white">{m.label}</p>
                                    <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{m.description}</p>
                                </TableCell>
                                {PERMISSION_LEVELS.map((l) => {
                                    // A level this module does not use (Jawaf has only View and Edit): a dash, no box.
                                    if (m.levels && !m.levels.includes(l)) {
                                        return <TableCell key={l} className="text-center text-sm text-neutral-400 dark:text-neutral-600" aria-label={`${m.label}: no ${LEVEL_LABEL[l]} level`}>-</TableCell>
                                    }
                                    const checked = allGranted || (value[m.id] ?? []).includes(l)
                                    return (
                                        <TableCell key={l} className="text-center">
                                            <Checkbox
                                                checked={checked}
                                                disabled={readOnly || allGranted}
                                                onCheckedChange={(v) => toggle(m.id, l, v === true)}
                                                aria-label={`${m.label}: ${LEVEL_LABEL[l]}`}
                                                className="cursor-pointer disabled:cursor-not-allowed"
                                            />
                                        </TableCell>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </ScrollArea>
    )
}
