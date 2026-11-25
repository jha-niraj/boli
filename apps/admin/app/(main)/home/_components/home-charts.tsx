"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts"
import { ChartEmpty } from "@repo/ui/components/charts/chart-empty"
import { TrendLineChart } from "@repo/ui/components/charts/panel-charts"
import { ResponsiveChart } from "@repo/ui/components/ui/responsive-chart"
import { CHART_AXIS_PROPS, CHART_BAR_CURSOR, CHART_GRID_PROPS, CHART_MONO } from "@repo/ui/lib/chart-theme"
import { SKY } from "@repo/brand/sky"
import { formatCredits, MICRO_PER_CREDIT } from "@repo/boli"
import { dayLabel, fmtNumber } from "@/components/admin-format"
import type { HomeDay } from "@/lib/home-data"

/*
 * Home's two charts (plan/admin/jawaf/admin-v1.md "Admin Home"), 30 Nepal days each, one metric per chart in its real
 * unit. Sign-ups: the shared trend line. Credits spent: stacked bars Kura (neutral ink) / API (the sky accent) / Jawaf
 * (a pale sky), like apps/main's SpendChart. Charts sit in a parent with a set height (ResponsiveChart).
 */

export function SignupsChart({ days, height = 220 }: { days: HomeDay[]; height?: number }) {
    const points = React.useMemo(() => days.map((d) => ({ label: dayLabel(d.day), value: d.signups })), [days])
    return <TrendLineChart points={points} name="New users" height={height} emptyMessage="No one signed up in the last 30 days" keepLastLabel />
}

type Row = { day: string; label: string; kura: number; api: number; jawaf: number; kuraMicro: number; apiMicro: number; jawafMicro: number }

const JAWAF_FILL = "#a9c6e8"

function axisCredits(v: number): string {
    if (v === 0) return "0"
    if (v < 10) return v.toFixed(2)
    return Math.round(v).toLocaleString("en-US")
}

function SpendTooltip({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload?: Row }> }) {
    const row = payload?.[0]?.payload
    if (!active || !row) return null
    return (
        <div className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs shadow-md dark:border-neutral-800 dark:bg-neutral-900">
            <p className="font-medium text-neutral-900 dark:text-white">{dayLabel(row.day)}</p>
            <p className="mt-1 flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300"><span className="h-2 w-2 rounded-sm bg-neutral-500" /> Kura {formatCredits(row.kuraMicro)}</p>
            <p className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300"><span className="h-2 w-2 rounded-sm bg-boli-sky" /> API {formatCredits(row.apiMicro)}</p>
            <p className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300"><span className="h-2 w-2 rounded-sm" style={{ background: JAWAF_FILL }} /> Jawaf {formatCredits(row.jawafMicro)}</p>
        </div>
    )
}

/** Takes Home's days or the financial report's (lib/money-data.ts SpendDay): only the day and the three spends are read. */
export function SpendChart({ days, height = 220 }: { days: Pick<HomeDay, "day" | "kuraMicro" | "apiMicro" | "jawafMicro">[]; height?: number }) {
    const rows: Row[] = React.useMemo(() => days.map((d) => ({
        day: d.day,
        label: dayLabel(d.day),
        kura: d.kuraMicro / MICRO_PER_CREDIT,
        api: d.apiMicro / MICRO_PER_CREDIT,
        jawaf: d.jawafMicro / MICRO_PER_CREDIT,
        kuraMicro: d.kuraMicro,
        apiMicro: d.apiMicro,
        jawafMicro: d.jawafMicro,
    })), [days])
    const total = rows.reduce((t, r) => t + r.kuraMicro + r.apiMicro + r.jawafMicro, 0)
    if (total === 0) return <ChartEmpty message="No credits spent in the last 30 days" height={height} />

    return (
        <div className="min-w-0">
            <div className="min-w-0 dark:[&_.boli-api-bar_path]:fill-boli-sky-dark" style={{ height }}>
                <ResponsiveChart>
                    <BarChart data={rows} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
                        <CartesianGrid {...CHART_GRID_PROPS} />
                        <XAxis dataKey="label" {...CHART_AXIS_PROPS} interval="equidistantPreserveEnd" minTickGap={8} />
                        <YAxis {...CHART_AXIS_PROPS} width={48} tickFormatter={axisCredits} />
                        <Tooltip cursor={CHART_BAR_CURSOR} content={<SpendTooltip />} />
                        <Bar dataKey="kura" name="Kura" stackId="spend" fill={CHART_MONO.mark} maxBarSize={18} isAnimationActive={false} />
                        <Bar dataKey="api" name="API" stackId="spend" fill={SKY.fill} className="boli-api-bar" maxBarSize={18} isAnimationActive={false} />
                        <Bar dataKey="jawaf" name="Jawaf" stackId="spend" fill={JAWAF_FILL} radius={[3, 3, 0, 0]} maxBarSize={18} isAnimationActive={false} />
                    </BarChart>
                </ResponsiveChart>
            </div>
            <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-600 dark:text-neutral-300">
                <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-neutral-500" />Kura</li>
                <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-boli-sky" />API</li>
                <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: JAWAF_FILL }} />Jawaf</li>
                <li className="text-neutral-500">{formatCredits(total)} credits in 30 days, Nepal time</li>
            </ul>
        </div>
    )
}

/** "12 sign-ups in 30 days" for the chart panel's hint. */
export function signupsHint(days: HomeDay[]): string {
    const n = days.reduce((t, d) => t + d.signups, 0)
    return `${fmtNumber(n)} in the last 30 days, Nepal time`
}
