"use client"

import { Plus, X } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import type { JawafTable } from "@/types/jawaf"

/** Server limits (schemas/jawaf.ts jawafTableSchema). */
export const TABLE_MAX_COLUMNS = 8
export const TABLE_MAX_ROWS = 200

/** A fresh Prices and fees table. */
export const PRICE_TABLE: JawafTable = { columns: ["Item", "Price", "Notes"], rows: [["", "", ""]] }
/** A fresh owner table (Notes > New table). */
export const BLANK_TABLE: JawafTable = { columns: ["Column 1", "Column 2"], rows: [["", ""]] }

/** Drop rows with nothing typed in them (what is saved). */
export function cleanTable(t: JawafTable): JawafTable {
    return { columns: t.columns.map((c, i) => c.trim() || `Column ${i + 1}`), rows: t.rows.filter((r) => r.some((c) => c.trim())) }
}

/**
 * The grid editor for a fact's Prices and fees table and for owner tables: a heading row, then rows of cells. Inside a
 * horizontal ScrollArea so a wide table scrolls in its box and the sheet never scrolls sideways. Prices are only ever
 * answered from this table (plan: "prices only from the facts table"), so it stays plain text cells - "NPR 4,500",
 * "Free", "On request".
 */
export function TableEditor({ value, onChange, disabled }: { value: JawafTable; onChange: (next: JawafTable) => void; disabled?: boolean }) {
    const cols = value.columns.length
    const setColumn = (i: number, v: string) => onChange({ ...value, columns: value.columns.map((c, j) => (j === i ? v : c)) })
    const setCell = (r: number, c: number, v: string) =>
        onChange({ ...value, rows: value.rows.map((row, i) => (i === r ? row.map((cell, j) => (j === c ? v : cell)) : row)) })
    const addRow = () => onChange({ ...value, rows: [...value.rows, Array.from({ length: cols }, () => "")] })
    const removeRow = (r: number) => onChange({ ...value, rows: value.rows.filter((_, i) => i !== r) })
    const addColumn = () => onChange({ columns: [...value.columns, `Column ${cols + 1}`], rows: value.rows.map((row) => [...row, ""]) })
    const removeColumn = (c: number) => onChange({ columns: value.columns.filter((_, i) => i !== c), rows: value.rows.map((row) => row.filter((_, i) => i !== c)) })
    const width = `${cols * 10 + 2.5}rem`

    return (
        <div className="flex min-w-0 flex-col gap-2">
            <ScrollArea orientation="horizontal" className="w-full min-w-0 rounded-xl border border-neutral-200 dark:border-neutral-800">
                <div className="flex flex-col gap-1.5 p-2" style={{ minWidth: width }}>
                    <div className="flex items-center gap-1.5">
                        {value.columns.map((c, i) => (
                            <div key={i} className="flex min-w-0 flex-1 items-center gap-0.5">
                                <Input
                                    value={c}
                                    onChange={(e) => setColumn(i, e.target.value)}
                                    disabled={disabled}
                                    aria-label={`Column ${i + 1} heading`}
                                    className="h-8 min-w-0 flex-1 text-xs font-medium"
                                    maxLength={80}
                                />
                                {cols > 1 ? (
                                    <Button type="button" variant="ghost" size="icon-sm" disabled={disabled} onClick={() => removeColumn(i)} aria-label={`Remove column ${c || i + 1}`} className="size-7 shrink-0 cursor-pointer rounded-full text-neutral-500">
                                        <X className="h-3.5 w-3.5" />
                                    </Button>
                                ) : null}
                            </div>
                        ))}
                        <span className="w-8 shrink-0" />
                    </div>
                    {value.rows.map((row, r) => (
                        <div key={r} className="flex items-center gap-1.5">
                            {row.map((cell, c) => (
                                <Input
                                    key={c}
                                    value={cell}
                                    onChange={(e) => setCell(r, c, e.target.value)}
                                    disabled={disabled}
                                    aria-label={`${value.columns[c] || `Column ${c + 1}`}, row ${r + 1}`}
                                    className="h-8 min-w-0 flex-1 text-sm"
                                    maxLength={500}
                                />
                            ))}
                            <Button type="button" variant="ghost" size="icon-sm" disabled={disabled} onClick={() => removeRow(r)} aria-label={`Remove row ${r + 1}`} className="size-8 shrink-0 cursor-pointer rounded-full text-neutral-500">
                                <X className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    ))}
                </div>
            </ScrollArea>
            <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" className="cursor-pointer gap-1.5" disabled={disabled || value.rows.length >= TABLE_MAX_ROWS} onClick={addRow}>
                    <Plus className="h-3.5 w-3.5" /> Add row
                </Button>
                <Button type="button" variant="ghost" size="sm" className="cursor-pointer gap-1.5" disabled={disabled || cols >= TABLE_MAX_COLUMNS} onClick={addColumn}>
                    <Plus className="h-3.5 w-3.5" /> Add column
                </Button>
            </div>
        </div>
    )
}

/** A read-only table (a fact card, a note row). Scrolls sideways inside its own box. */
export function TableView({ table }: { table: JawafTable }) {
    if (!table.rows.length) return null
    return (
        <ScrollArea orientation="horizontal" className="w-full min-w-0 rounded-xl border border-neutral-200 dark:border-neutral-800">
            <table className="w-full text-left text-sm" style={{ minWidth: `${table.columns.length * 8}rem` }}>
                <thead>
                    <tr>
                        {table.columns.map((c, i) => (
                            <th key={i} className="border-b border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">{c}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {table.rows.map((row, r) => (
                        <tr key={r} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800/60">
                            {row.map((cell, c) => <td key={c} className="px-3 py-1.5 align-top text-neutral-900 dark:text-neutral-100">{cell}</td>)}
                        </tr>
                    ))}
                </tbody>
            </table>
        </ScrollArea>
    )
}
