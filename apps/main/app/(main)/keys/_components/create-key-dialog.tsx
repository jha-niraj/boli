"use client"

import * as React from "react"
import { TriangleAlert } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@repo/ui/components/ui/dialog"
import { InlineLoader } from "@repo/brand/loaders/spinners"
import { Input } from "@repo/ui/components/ui/input"
import { Label } from "@repo/ui/components/ui/label"
import { toast } from "@repo/ui/components/ui/toast"
import { CopyButton } from "@repo/brand/code-tabs"
import { createKey } from "@/actions/keys.action"
import type { CreatedApiKey } from "@/types/platform"

/**
 * Create an API key in two views: (1) a name, (2) "Save your key now" - the full key, shown this once, with Copy and a
 * warning. The second view closes only through Done (no outside click, no Esc), so the key is not lost by accident.
 * The views reset each time the dialog opens.
 */
export function CreateKeyDialog({ open, onOpenChange, atLimit, limitReason, onCreated }: {
    open: boolean
    onOpenChange: (open: boolean) => void
    atLimit: boolean
    limitReason: string
    onCreated: () => Promise<void>
}) {
    const [name, setName] = React.useState("")
    const [created, setCreated] = React.useState<CreatedApiKey | null>(null)
    const [pending, setPending] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)

    React.useEffect(() => {
        if (!open) return
        setName("")
        setCreated(null)
        setError(null)
    }, [open])

    async function submit(e: React.FormEvent) {
        e.preventDefault()
        if (!name.trim() || pending || atLimit) return
        setPending(true)
        setError(null)
        const r = await createKey({ name })
        setPending(false)
        if (!r.success) {
            setError(r.error ?? "The key could not be created. Try again.")
            return
        }
        setCreated(r.data)
        await onCreated()
    }

    const revealing = created !== null

    return (
        <Dialog open={open} onOpenChange={(next) => { if (!next && revealing) return; onOpenChange(next) }}>
            <DialogContent
                hideClose={revealing}
                className="max-w-[calc(100vw-2rem)] rounded-2xl sm:max-w-md"
                onInteractOutside={(e) => { if (revealing) e.preventDefault() }}
                onEscapeKeyDown={(e) => { if (revealing) e.preventDefault() }}
            >
                {revealing ? (
                    <>
                        <DialogHeader>
                            <DialogTitle className="text-base font-semibold">Save your key now</DialogTitle>
                            <DialogDescription className="text-xs">Copy it into your .env as BOLI_API_KEY. It cannot be shown again.</DialogDescription>
                        </DialogHeader>
                        <div className="flex min-w-0 flex-col gap-3">
                            <div className="flex min-w-0 items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-2 pl-3 dark:border-neutral-800 dark:bg-neutral-950">
                                <code className="min-w-0 flex-1 break-all font-mono text-xs text-neutral-900 dark:text-neutral-100">{created.key}</code>
                                <CopyButton text={created.key} className="shrink-0" />
                            </div>
                            <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                                <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                We only keep a fingerprint of this key. If you lose it, revoke it and create a new one.
                            </p>
                        </div>
                        <DialogFooter>
                            <Button type="button" onClick={() => { toast.success("Key created"); onOpenChange(false) }}>Done</Button>
                        </DialogFooter>
                    </>
                ) : (
                    <form onSubmit={submit} className="flex min-w-0 flex-col gap-4">
                        <DialogHeader>
                            <DialogTitle className="text-base font-semibold">Create API key</DialogTitle>
                            <DialogDescription className="text-xs">Name this key so you can tell it apart later.</DialogDescription>
                        </DialogHeader>
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="key-name" className="text-sm">Name</Label>
                            <Input
                                id="key-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. production-app"
                                maxLength={60}
                                autoComplete="off"
                                className="h-9 text-sm"
                                autoFocus
                            />
                            {error ? <p className="text-xs text-rose-700 dark:text-rose-400">{error}</p> : null}
                            {atLimit ? <p className="text-xs text-neutral-600 dark:text-neutral-400">{limitReason}</p> : null}
                        </div>
                        <DialogFooter className="gap-2">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button type="submit" disabled={!name.trim() || pending || atLimit} className="gap-2">
                                {pending ? <InlineLoader size={14} label="Creating" /> : null}
                                Create key
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    )
}
