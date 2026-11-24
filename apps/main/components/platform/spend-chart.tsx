"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts"
import { ChartEmpty } from "@repo/ui/components/charts/chart-empty"
import { ResponsiveChart } from "@repo/ui/components/ui/responsive-chart"
import { CHART_AXIS_PROPS, CHART_BAR_CURSOR, CHART_GRID_PROPS, CHART_MONO } from "@repo/ui/lib/chart-theme"
import { cn } from "@repo/ui/lib/utils"
import { formatCredits, MICRO_PER_CREDIT } from "@/lib/boli"
import { SKY, SKY_FILL } from "./sky"
import { formatDayKey } from "@/lib/platform-display"
import { shortDay } from "@/lib/format"
import type { UsageDay, UsageSourceFilter } from "@/types/platform"

/**
 * Credits spent per Nepal day, stacked Kura (neutral) under API (the C5 sky accent). One metric in its real unit; the
 * tooltip prints both parts with formatCredits. `source` hides the other series when the page filters by one.
 */

type Row = { day: string; label: string; kura: number; api: number; kuraMicro: number; apiMicro: number; requests: number }

const API_FILL = SKY.fill

function axisCredits(v: number): string {
    if (v === 0) return "0"
    if (v < 0.01) return v.toFixed(4)
    if (v < 10) return v.toFixed(2)
    return Math.round(v).toLocaleString("en-US")
}

function SpendTooltip({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload?: Row }> }) {
    const row = payload?.[0]?.payload
    if (!active || !row) return null
    return (
        <div className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs shadow-md dark:border-neutral-800 dark:bg-neutral-900">
            <p className="font-medium text-neutral-900 dark:text-white">{formatDayKey(row.day)}</p>
            <p className="mt-1 flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
                <span className="h-2 w-2 rounded-sm bg-neutral-500" /> Kura {formatCredits(row.kuraMicro)}
            </p>
            <p className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
                <span className={cn("h-2 w-2 rounded-sm", SKY_FILL)} /> API {formatCredits(row.apiMicro)}
            </p>
            <p className="mt-1 text-neutral-600 dark:text-neutral-400">{row.requests.toLocaleString("en-US")} requests</p>
        </div>
    )
}

export function SpendChart({ days, source = "all", height = 220, emptyMessage }: {
    days: UsageDay[]
    source?: UsageSourceFilter
    height?: number
    emptyMessage: string
}) {
    const rows: Row[] = React.useMemo(() => days.map((d) => {
        const kuraMicro = source === "api" ? 0 : d.kura.costMicro
        const apiMicro = source === "kura" ? 0 : d.api.costMicro
        return {
            day: d.day,
            label: shortDay(d.day),
            kura: kuraMicro / MICRO_PER_CREDIT,
            api: apiMicro / MICRO_PER_CREDIT,
            kuraMicro,
            apiMicro,
            requests: (source === "api" ? 0 : d.kura.requests) + (source === "kura" ? 0 : d.api.requests),
        }
    }), [days, source])

    if (rows.every((r) => r.kuraMicro === 0 && r.apiMicro === 0)) return <ChartEmpty message={emptyMessage} height={height} />

    return (
        <div className="min-w-0">
            <div className="min-w-0 dark:[&_.boli-api-bar_path]:fill-boli-sky-dark" style={{ height }}>
                <ResponsiveChart>
                    <BarChart data={rows} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
                        <CartesianGrid {...CHART_GRID_PROPS} />
                        <XAxis dataKey="label" {...CHART_AXIS_PROPS} interval="equidistantPreserveEnd" minTickGap={8} />
                        <YAxis {...CHART_AXIS_PROPS} width={48} tickFormatter={axisCredits} />
                        <Tooltip cursor={CHART_BAR_CURSOR} content={<SpendTooltip />} />
                        {source !== "api" && <Bar dataKey="kura" name="Kura" stackId="spend" fill={CHART_MONO.mark} maxBarSize={18} isAnimationActive={false} />}
                        {source !== "kura" && <Bar dataKey="api" name="API" stackId="spend" fill={API_FILL} className="boli-api-bar" radius={[3, 3, 0, 0]} maxBarSize={18} isAnimationActive={false} />}
                    </BarChart>
                </ResponsiveChart>
            </div>
            <ul className={cn("mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-600 dark:text-neutral-300")}>
                {source !== "api" && <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-neutral-500" />Kura</li>}
                {source !== "kura" && <li className="flex items-center gap-1.5"><span className={cn("h-2 w-2 rounded-sm", SKY_FILL)} />API</li>}
                <li className="text-neutral-500">Credits per day, Nepal time</li>
            </ul>
        </div>
    )
}
