"use client"

import { Label } from "@repo/ui/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/ui/select"
import { Switch } from "@repo/ui/components/ui/switch"
import { cn } from "@repo/ui/lib/utils"
import {
    JAWAF_LEVEL_INFO, WORKSPACE_PRODUCTS, type JawafLevel, type WorkspaceAccess, type WorkspaceProduct,
} from "@repo/boli/workspace-access"

function isOn(access: WorkspaceAccess, product: WorkspaceProduct): boolean {
    return product === "jawaf" ? access.jawaf.access : access[product]
}

function setOn(access: WorkspaceAccess, product: WorkspaceProduct, on: boolean): WorkspaceAccess {
    if (product === "jawaf") return { ...access, jawaf: { ...access.jawaf, access: on } }
    return { ...access, [product]: on }
}

/**
 * Per-product access, drawn from the ONE catalogue (@repo/boli/workspace-access): a switch per product, and for a
 * product with levels (Jawaf) a level picker once it is on. `onChange` absent = read-only.
 */
export function AccessEditor({ value, onChange, idPrefix }: {
    value: WorkspaceAccess
    onChange?: (next: WorkspaceAccess) => void
    idPrefix: string
}) {
    const readOnly = !onChange
    return (
        <div className="flex min-w-0 flex-col divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
            {WORKSPACE_PRODUCTS.map((p) => {
                const on = isOn(value, p.id)
                const switchId = `${idPrefix}-${p.id}`
                return (
                    <div key={p.id} className="flex min-w-0 flex-col gap-3 px-4 py-3">
                        <div className="flex min-w-0 items-center justify-between gap-3">
                            <div className="min-w-0">
                                <Label htmlFor={switchId} className={cn("text-sm font-medium text-neutral-900 dark:text-white", !readOnly && "cursor-pointer")}>{p.label}</Label>
                                <p className="text-xs text-neutral-600 dark:text-neutral-400">{p.description}</p>
                            </div>
                            <Switch
                                id={switchId}
                                checked={on}
                                disabled={readOnly}
                                onCheckedChange={(v) => onChange?.(setOn(value, p.id, v))}
                                aria-label={`${p.label} access`}
                                className="data-[state=checked]:bg-boli-sky"
                            />
                        </div>
                        {p.id === "jawaf" && on ? (
                            <div className="flex min-w-0 flex-col gap-1.5">
                                <Label htmlFor={`${switchId}-level`} className="text-xs text-neutral-700 dark:text-neutral-300">What they can do in Jawaf</Label>
                                <Select
                                    value={value.jawaf.level}
                                    disabled={readOnly}
                                    onValueChange={(v) => onChange?.({ ...value, jawaf: { ...value.jawaf, level: v as JawafLevel } })}
                                >
                                    <SelectTrigger id={`${switchId}-level`} className="h-9 w-full cursor-pointer text-sm sm:w-72">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {JAWAF_LEVEL_INFO.map((l) => (
                                            <SelectItem key={l.id} value={l.id} className="cursor-pointer">
                                                {l.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                                    {JAWAF_LEVEL_INFO.find((l) => l.id === value.jawaf.level)?.description}
                                </p>
                            </div>
                        ) : null}
                    </div>
                )
            })}
        </div>
    )
}
