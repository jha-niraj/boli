"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { FlaskConical, Square } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { InlineNote } from "@repo/ui/components/ui/inline-note"
import { Progress } from "@repo/ui/components/ui/progress"
import { getJawafEvalInfo, runJawafEvalBatch } from "@/actions/jawaf/bots.action"
import type { EvalRowResult } from "@/types/jawaf"
import { Dot, SectionTitle } from "../../_components/jawaf-bits"

const pct = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)}%` : "-")

/**
 * The quality check: the bot's question set (ml/jawaf-eval/questions) through THE answer engine, 3 questions per call,
 * with progress. Scored like ml/jawaf-eval/run.mts: correct, correct refusals, right script, invented numbers (bars
 * >= 85%, >= 90%, >= 95%, 0 invented prices). No conversation rows, no charges. Replies are listed for demo bots only.
 */
export function EvalPanel({ botId, house, canWrite }: { botId: string; house: boolean; canWrite: boolean }) {
    const info = useQuery({
        queryKey: ["jawaf", "eval", botId],
        queryFn: async () => {
            const r = await getJawafEvalInfo(botId)
            if (!r.success) throw new Error(r.error ?? "Could not check")
            return r.data
        },
    })
    const [rows, setRows] = React.useState<EvalRowResult[]>([])
    const [running, setRunning] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)
    const stopRef = React.useRef(false)
    React.useEffect(() => () => { stopRef.current = true }, [])

    async function run() {
        const total = info.data?.total ?? 0
        const batch = info.data?.batch ?? 3
        if (!total) return
        stopRef.current = false
        setRows([]); setError(null); setRunning(true)
        for (let offset = 0; offset < total; offset += batch) {
            if (stopRef.current) break
            const r = await runJawafEvalBatch({ botId, offset })
            if (!r.success) { setError(r.error ?? "The check stopped."); break }
            setRows((cur) => [...cur, ...r.data])
        }
        setRunning(false)
    }

    const total = info.data?.total ?? 0
    const answerable = rows.filter((r) => !r.mustRefuse)
    const refuse = rows.filter((r) => r.mustRefuse)
    const invented = rows.filter((r) => r.invented.length).length
    const inventedMoney = rows.filter((r) => r.inventedMoney.length).length
    const scriptOk = rows.filter((r) => r.scriptOk).length
    const misses = rows.filter((r) => !r.ok || !r.scriptOk || r.inventedMoney.length)

    return (
        <section className="flex min-w-0 flex-col gap-2">
            <SectionTitle>Quality check</SectionTitle>
            {info.data && !info.data.bridge ? (
                <InlineNote tone="warning">JAWAF_ADMIN_SECRET is not set, so the admin cannot ask the engine. Set it in apps/admin and apps/main env files.</InlineNote>
            ) : info.data && !total ? (
                <p className="text-sm text-neutral-600 dark:text-neutral-400">No question set for this bot yet. Write ml/jawaf-eval/questions/&lt;site&gt;.json from the pages it read (see ml/jawaf-eval/README.md) and register it in lib/jawaf-eval-sets.ts.</p>
            ) : (
                <p className="text-sm text-neutral-600 dark:text-neutral-400">{total ? `${total} questions in Nepali, Romanized Nepali and English, including ones it must refuse. A few minutes; nothing is stored or charged.` : "Checking for a question set"}</p>
            )}
            {rows.length || running ? (
                <>
                    <Progress value={total ? (100 * rows.length) / total : 0} />
                    <dl className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4">
                        <Score label="Correct" value={pct(answerable.filter((r) => r.ok).length, answerable.length)} bar="85%" ok={!answerable.length || answerable.filter((r) => r.ok).length / answerable.length >= 0.85} />
                        <Score label="Refusals" value={pct(refuse.filter((r) => r.ok).length, refuse.length)} bar="90%" ok={!refuse.length || refuse.filter((r) => r.ok).length / refuse.length >= 0.9} />
                        <Score label="Script" value={pct(scriptOk, rows.length)} bar="95%" ok={!rows.length || scriptOk / rows.length >= 0.95} />
                        <Score label="Invented prices" value={String(inventedMoney)} bar="0" ok={inventedMoney === 0} hint={invented ? `${invented} with other new numbers` : undefined} />
                    </dl>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">{rows.length} of {total} asked{running ? "..." : ""}</p>
                </>
            ) : null}
            {error ? <InlineNote tone="danger">{error}</InlineNote> : null}
            {house && !running && misses.length ? (
                <ul className="flex min-w-0 flex-col divide-y divide-neutral-200 dark:divide-neutral-800">
                    {misses.map((r) => (
                        <li key={r.id} className="flex min-w-0 flex-col gap-0.5 py-2">
                            <span className="flex min-w-0 items-center gap-2">
                                <Dot tone="warn">{r.mustRefuse ? "Should refuse" : !r.ok ? "Missed" : !r.scriptOk ? "Wrong script" : "Invented price"}</Dot>
                                <span className="truncate text-xs text-neutral-500 dark:text-neutral-400">{r.id} - {r.status}</span>
                            </span>
                            <span className="text-sm text-neutral-900 dark:text-white">{r.question}</span>
                            <span className="line-clamp-3 text-xs text-neutral-600 dark:text-neutral-400">{r.reply}</span>
                        </li>
                    ))}
                </ul>
            ) : null}
            {canWrite && total && info.data?.bridge ? (
                <div className="flex gap-2">
                    {running ? (
                        <Button type="button" size="sm" variant="outline" className="cursor-pointer gap-1.5 rounded-xl" onClick={() => { stopRef.current = true }}>
                            <Square className="h-3.5 w-3.5" /> Stop
                        </Button>
                    ) : (
                        <Button type="button" size="sm" variant="outline" className="cursor-pointer gap-1.5 rounded-xl" onClick={() => void run()}>
                            <FlaskConical className="h-3.5 w-3.5" /> {rows.length ? "Run again" : "Run the quality check"}
                        </Button>
                    )}
                </div>
            ) : null}
        </section>
    )
}

function Score({ label, value, bar, ok, hint }: { label: string; value: string; bar: string; ok: boolean; hint?: string }) {
    return (
        <div className="min-w-0 rounded-xl border border-neutral-200 px-3 py-2 dark:border-neutral-800">
            <dt className="truncate text-xs text-neutral-600 dark:text-neutral-400">{label}</dt>
            <dd className={ok ? "text-base font-semibold tabular-nums text-neutral-900 dark:text-white" : "text-base font-semibold tabular-nums text-rose-700 dark:text-rose-400"}>{value}</dd>
            <dd className="truncate text-xs text-neutral-500 dark:text-neutral-400">{hint ?? `bar ${bar}`}</dd>
        </div>
    )
}
