"use client"

import { BookOpen, Boxes, Check, MessagesSquare } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"
import { Button } from "@repo/ui/components/ui/button"
import { Page } from "@repo/ui/components/ui/page"
import { cn } from "@repo/ui/lib/utils"
import { DashDhaka } from "@/components/platform/dhaka-band"
import { SKY_SOFT, SKY_TEXT } from "@/components/platform/sky"
import { MODELS, RATE_LIMIT_PER_MIN, type BoliModel } from "@repo/boli"
import { ROUTES } from "@/lib/navigation"
import { WEB } from "@/lib/web-links"
import { MODELS_DESCRIPTION, MODELS_TITLE } from "./models-skeleton"

function Fact({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-0 rounded-xl bg-neutral-50 px-3 py-2 dark:bg-neutral-950/60">
            <p className="text-xs text-neutral-600 dark:text-neutral-400">{label}</p>
            <p className="truncate text-sm font-medium text-neutral-900 dark:text-white">{value}</p>
        </div>
    )
}

/** One catalogue card, laid out like Sarvam's: icon + name + badges, a line, the facts, the prices, Try / Docs. */
function ModelCard({ model }: { model: BoliModel }) {
    return (
        <article className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <DashDhaka height={9} />
            <div className="flex min-w-0 flex-1 flex-col p-5">
            <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-100">
                    <Boxes className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                    <h2 className="truncate font-mono text-base font-semibold text-neutral-900 dark:text-white">{model.id}</h2>
                    <p className="truncate text-xs text-neutral-600 dark:text-neutral-400">{model.label}</p>
                </div>
                <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
                    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium", SKY_SOFT, SKY_TEXT)}>
                        <span aria-hidden className="size-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" /> Live
                    </span>
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">Chat</span>
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">Open weights</span>
                </div>
            </div>

            <p className="mt-4 text-sm text-neutral-700 dark:text-neutral-300">{model.blurb}</p>

            <ul className="mt-3 flex flex-col gap-1">
                {model.languages.map((l) => (
                    <li key={l} className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                        <Check className="h-3.5 w-3.5 shrink-0 text-neutral-500" /> {l}
                    </li>
                ))}
            </ul>

            <div className="mt-4 grid grid-cols-2 gap-2">
                <Fact label="Context" value={`${model.contextTokens.toLocaleString("en-US")} tokens`} />
                <Fact label="Licence" value={model.licence} />
                <Fact label="Rate limit" value={`${RATE_LIMIT_PER_MIN} requests / min`} />
                <Fact label="Base" value={model.base.split(" (")[0] ?? model.base} />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
                <div>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">Input, per 1M tokens</p>
                    <p className="font-serif text-2xl tabular-nums text-neutral-900 dark:text-white">{model.pricePerMillion.input} <span className="font-sans text-xs text-neutral-600 dark:text-neutral-400">credits</span></p>
                </div>
                <div>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">Output, per 1M tokens</p>
                    <p className="font-serif text-2xl tabular-nums text-neutral-900 dark:text-white">{model.pricePerMillion.output} <span className="font-sans text-xs text-neutral-600 dark:text-neutral-400">credits</span></p>
                </div>
                <p className="col-span-2 text-xs text-neutral-600 dark:text-neutral-400">1 credit = Rs 1. Thinking tokens are billed as output.</p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild size="sm" className="gap-1.5">
                    <AppLink href={ROUTES.kura}><MessagesSquare className="h-3.5 w-3.5" /> Try in Kura</AppLink>
                </Button>
                <Button asChild variant="outline" size="sm" className="gap-1.5">
                    <AppLink href={WEB.doc("chatcompletions")}><BookOpen className="h-3.5 w-3.5" /> API docs</AppLink>
                </Button>
            </div>
            </div>
        </article>
    )
}

export function ModelsView() {
    return (
        <Page title={MODELS_TITLE} description={MODELS_DESCRIPTION}>
            <div className="grid min-w-0 gap-3 pb-6 lg:grid-cols-2">
                {MODELS.map((m) => <ModelCard key={m.id} model={m} />)}
            </div>
        </Page>
    )
}
