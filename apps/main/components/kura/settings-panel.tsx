'use client'

import { useId, useState } from 'react'
import { Check, RotateCcw } from 'lucide-react'
import { Button } from '@repo/ui/components/ui/button'
import { Label } from '@repo/ui/components/ui/label'
import { ScrollArea } from '@repo/ui/components/ui/scroll-area'
import { Textarea } from '@repo/ui/components/ui/textarea'
import { cn } from '@repo/ui/lib/utils'
import { BOLI_CHAT, DEFAULT_SYSTEM_PROMPT, KURA_DEFAULTS, KURA_LIMITS, type KuraSettings } from '@/lib/boli'
import { SYSTEM_PROMPT_MAX, sameSettings } from '@/lib/ai/settings'
import { useKuraSettings, type SaveState } from './use-kura-settings'

/**
 * Settings tab: the conversation's system prompt and sampling. Every control applies to the NEXT message; a saved chat
 * keeps them (ai_conversation.settings). Think lives in the composer, not here.
 */

type NumericKey = 'temperature' | 'maxTokens' | 'topP' | 'topK'

const FIELDS: { key: NumericKey; label: string; hint: string }[] = [
    { key: 'temperature', label: 'Temperature', hint: 'Lower is steadier, higher is more varied.' },
    { key: 'maxTokens', label: 'Max tokens', hint: 'The longest reply, in tokens (thinking counts).' },
    { key: 'topP', label: 'Top-p', hint: 'Sample from the most likely words that add up to this share.' },
    { key: 'topK', label: 'Top-k', hint: 'Sample from this many most likely words.' },
]

const decimals = (step: number) => (String(step).split('.')[1]?.length ?? 0)

function clamp(key: NumericKey, n: number): number {
    const l = KURA_LIMITS[key]
    const stepped = Math.round(n / l.step) * l.step
    return Number(Math.min(l.max, Math.max(l.min, stepped)).toFixed(decimals(l.step)))
}

function SaveLine({ state, saved }: { state: SaveState; saved: boolean }) {
    const text = !saved
        ? 'Applies to your first message, then saved with this chat.'
        : state === 'saving' ? 'Saving...' : state === 'error' ? 'Could not save - your next message still uses these.' : state === 'saved' ? 'Saved with this chat.' : 'Saved with this chat. Changes apply to your next message.'
    return (
        <p className={cn('flex items-center gap-1.5 text-xs', state === 'error' ? 'text-red-600 dark:text-red-400' : 'text-neutral-600 dark:text-neutral-400')}>
            {saved && state === 'saved' && <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />}
            {text}
        </p>
    )
}

function NumberRow({ field, value, onChange }: { field: (typeof FIELDS)[number]; value: number; onChange: (n: number) => void }) {
    const id = useId()
    const l = KURA_LIMITS[field.key]
    const isDefault = value === KURA_DEFAULTS[field.key]
    // The box keeps what is typed ("0." on the way to "0.5") and commits on blur or Enter.
    const [draft, setDraft] = useState<string | null>(null)
    const commit = () => {
        if (draft === null) return
        const n = Number(draft)
        if (draft.trim() !== '' && Number.isFinite(n)) onChange(clamp(field.key, n))
        setDraft(null)
    }
    return (
        <div className="min-w-0 space-y-1.5">
            <div className="flex min-w-0 items-center gap-2">
                <Label htmlFor={id} className="min-w-0 flex-1 truncate text-sm font-medium">{field.label}</Label>
                <input
                    type="text"
                    inputMode="decimal"
                    aria-label={`${field.label} value`}
                    value={draft ?? String(value)}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={commit}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit() } }}
                    className="h-7 w-20 shrink-0 border border-neutral-200 bg-transparent px-2.5 text-right text-xs tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-neutral-800"
                />
            </div>
            <input
                id={id}
                type="range"
                min={l.min}
                max={l.max}
                step={l.step}
                value={value}
                onChange={(e) => onChange(clamp(field.key, Number(e.target.value)))}
                className="h-1.5 w-full cursor-pointer accent-neutral-900 dark:accent-neutral-100"
            />
            <p className="flex min-w-0 justify-between gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                <span className="min-w-0">{field.hint}</span>
                {!isDefault && (
                    <button type="button" onClick={() => onChange(KURA_DEFAULTS[field.key])} className="shrink-0 cursor-pointer underline underline-offset-2 hover:text-neutral-900 dark:hover:text-neutral-100">
                        Default {KURA_DEFAULTS[field.key]}
                    </button>
                )}
            </p>
        </div>
    )
}

export function SettingsPanel() {
    const { settings, update, state, saved } = useKuraSettings()
    const promptId = useId()
    const promptIsDefault = settings.systemPrompt === DEFAULT_SYSTEM_PROMPT
    const allDefault = sameSettings(settings, { ...KURA_DEFAULTS, think: settings.think })
    const set = <K extends keyof KuraSettings>(key: K) => (v: KuraSettings[K]) => update({ [key]: v } as Partial<KuraSettings>)

    return (
        <ScrollArea orientation="vertical" className="min-h-0 flex-1">
            <div className="flex min-w-0 flex-col gap-5 p-4">
                <div className="min-w-0 space-y-1">
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">
                        Model <span className="font-mono text-neutral-900 dark:text-neutral-100">{BOLI_CHAT.id}</span> - {BOLI_CHAT.label}
                    </p>
                    <SaveLine state={state} saved={saved} />
                </div>

                <div className="min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2">
                        <Label htmlFor={promptId} className="flex-1 text-sm font-medium">System prompt</Label>
                        {!promptIsDefault && (
                            <button type="button" onClick={() => update({ systemPrompt: DEFAULT_SYSTEM_PROMPT })} className="cursor-pointer text-xs text-neutral-700 underline underline-offset-2 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100">
                                Reset
                            </button>
                        )}
                    </div>
                    <Textarea
                        id={promptId}
                        value={settings.systemPrompt}
                        maxLength={SYSTEM_PROMPT_MAX}
                        onChange={(e) => update({ systemPrompt: e.target.value })}
                        rows={8}
                        className="min-h-40 resize-y text-sm leading-relaxed"
                    />
                    <p className="flex justify-between gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                        <span>How Kura should behave. Blank uses the default.</span>
                        <span className="shrink-0 tabular-nums">{settings.systemPrompt.length.toLocaleString('en-US')} / {SYSTEM_PROMPT_MAX.toLocaleString('en-US')}</span>
                    </p>
                </div>

                {FIELDS.map((f) => <NumberRow key={f.key} field={f} value={settings[f.key]} onChange={set(f.key)} />)}

                <div className="flex items-center justify-between gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">Think is the pill in the message box.</p>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={allDefault}
                        onClick={() => update({ ...KURA_DEFAULTS, think: settings.think })}
                        className="shrink-0 cursor-pointer"
                    >
                        <RotateCcw className="h-3.5 w-3.5" /> Reset all
                    </Button>
                </div>
            </div>
        </ScrollArea>
    )
}
