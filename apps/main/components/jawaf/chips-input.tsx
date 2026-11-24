"use client"

import * as React from "react"
import { Plus, X } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"

/**
 * A short list typed one item at a time: Enter (or Add) turns the text into a chip, X removes one. For a Q&A's other
 * phrasings, suggested questions, extra email addresses and a select field's options. Duplicates (case-insensitive)
 * are ignored. `validate` returns a sentence to refuse an item.
 */
export function ChipsInput({ id, value, onChange, max, placeholder, maxLength = 200, validate, disabled, addLabel = "Add" }: {
    id?: string
    value: string[]
    onChange: (next: string[]) => void
    max: number
    placeholder?: string
    maxLength?: number
    validate?: (item: string) => string | null
    disabled?: boolean
    addLabel?: string
}) {
    const [draft, setDraft] = React.useState("")
    const [error, setError] = React.useState<string | null>(null)
    const full = value.length >= max

    const add = () => {
        const item = draft.trim()
        if (!item || full) return
        if (value.some((v) => v.toLowerCase() === item.toLowerCase())) { setDraft(""); return }
        const problem = validate?.(item) ?? null
        if (problem) { setError(problem); return }
        onChange([...value, item])
        setDraft("")
        setError(null)
    }

    return (
        <div className="flex min-w-0 flex-col gap-2">
            {value.length ? (
                <ul className="flex min-w-0 flex-wrap gap-1.5">
                    {value.map((v, i) => (
                        <li key={`${v}-${i}`} className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-full bg-neutral-100 py-1 pl-3 pr-1 text-xs text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
                            <span className="min-w-0 truncate">{v}</span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                disabled={disabled}
                                onClick={() => onChange(value.filter((_, j) => j !== i))}
                                aria-label={`Remove ${v}`}
                                className="size-5 shrink-0 cursor-pointer rounded-full text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        </li>
                    ))}
                </ul>
            ) : null}
            {!full ? (
                <div className="flex min-w-0 items-center gap-2">
                    <Input
                        id={id}
                        value={draft}
                        disabled={disabled}
                        onChange={(e) => { setDraft(e.target.value); setError(null) }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); add() }
                        }}
                        placeholder={placeholder}
                        maxLength={maxLength}
                        className="h-9 min-w-0 flex-1 text-sm"
                    />
                    <Button type="button" variant="outline" size="sm" disabled={disabled || !draft.trim()} onClick={add} className="shrink-0 cursor-pointer gap-1.5">
                        <Plus className="h-3.5 w-3.5" /> {addLabel}
                    </Button>
                </div>
            ) : (
                <p className="text-xs text-neutral-600 dark:text-neutral-400">That is the most you can add ({max}).</p>
            )}
            {error ? <p className="text-xs text-red-700 dark:text-red-400">{error}</p> : null}
        </div>
    )
}
