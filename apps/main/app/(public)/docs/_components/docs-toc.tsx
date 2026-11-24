"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@repo/ui/lib/utils"

export type DocHeading = { id: string; title: string; depth?: 2 | 3 }

/** Where the line runs for each depth (px from the list's left edge), and how tall a bend between depths is. */
const LINE_X = { 2: 1, 3: 11 } as const
const BEND = 5
/** A heading is "current" once its top passes this share of the viewport. */
const SPY_LINE = 0.35

type Geometry = { d: string; height: number; total: number; segments: { start: number; end: number }[] }

/**
 * "On this page" with a line that bends: a thin SVG track follows the items, stepping right under a nested (h3) item
 * and back, and an ink segment slides along the same path to the section in view. The path is measured from the
 * items themselves (ResizeObserver, so fonts and wrapping are right); the active segment is the path's stroke dash,
 * moved with a CSS transition (none under prefers-reduced-motion). Scroll-spy is an IntersectionObserver on the
 * headings; at the very bottom of the page the last item wins. Clicking scrolls smoothly (html scroll-behavior).
 */
export function DocsToc({ headings }: { headings: DocHeading[] }) {
    const listRef = useRef<HTMLUListElement>(null)
    const [geo, setGeo] = useState<Geometry | null>(null)
    const [active, setActive] = useState(headings[0]?.id ?? "")

    const measure = useCallback(() => {
        const list = listRef.current
        if (!list) return
        const items = Array.from(list.querySelectorAll<HTMLElement>("[data-toc-item]"))
        if (!items.length) return
        const xs = items.map((el) => (el.dataset.depth === "3" ? LINE_X[3] : LINE_X[2]))
        const points: { x: number; y: number }[] = []
        const marks: { startIdx: number; endIdx: number }[] = []
        items.forEach((el, i) => {
            const x = xs[i] ?? LINE_X[2]
            const top = el.offsetTop
            const bottom = top + el.offsetHeight
            const bendBefore = i > 0 && xs[i - 1] !== x
            const bendAfter = i < items.length - 1 && xs[i + 1] !== x
            points.push({ x, y: top + (bendBefore ? BEND : 0) })
            points.push({ x, y: bottom - (bendAfter ? BEND : 0) })
            marks.push({ startIdx: points.length - 2, endIdx: points.length - 1 })
        })
        const lengths = [0]
        for (let i = 1; i < points.length; i++) {
            const a = points[i - 1]!
            const b = points[i]!
            lengths.push(lengths[i - 1]! + Math.hypot(b.x - a.x, b.y - a.y))
        }
        const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" ")
        setGeo({
            d,
            height: list.offsetHeight,
            total: lengths[lengths.length - 1] ?? 0,
            segments: marks.map((m) => ({ start: lengths[m.startIdx] ?? 0, end: lengths[m.endIdx] ?? 0 })),
        })
    }, [])

    useEffect(() => {
        const list = listRef.current
        if (!list) return
        measure()
        const ro = new ResizeObserver(measure)
        ro.observe(list)
        return () => ro.disconnect()
    }, [measure, headings])

    useEffect(() => {
        const els = headings.map((h) => document.getElementById(h.id)).filter((el): el is HTMLElement => el !== null)
        if (!els.length) return
        const pick = () => {
            const doc = document.documentElement
            if (window.innerHeight + window.scrollY >= doc.scrollHeight - 4) {
                setActive(els[els.length - 1]!.id)
                return
            }
            const line = window.innerHeight * SPY_LINE
            let current = els[0]!.id
            for (const el of els) {
                if (el.getBoundingClientRect().top <= line) current = el.id
                else break
            }
            setActive(current)
        }
        // Fires whenever a heading crosses the spy line (the bottom of the root margin) or the top of the screen.
        const io = new IntersectionObserver(pick, { rootMargin: `0px 0px -${Math.round((1 - SPY_LINE) * 100)}% 0px`, threshold: [0, 1] })
        els.forEach((el) => io.observe(el))
        // The last sections may never reach the line; the page bottom selects the last item.
        let frame = 0
        const onScroll = () => {
            if (frame) return
            frame = requestAnimationFrame(() => {
                frame = 0
                const doc = document.documentElement
                if (window.innerHeight + window.scrollY >= doc.scrollHeight - 4) setActive(els[els.length - 1]!.id)
            })
        }
        window.addEventListener("scroll", onScroll, { passive: true })
        pick()
        return () => {
            io.disconnect()
            window.removeEventListener("scroll", onScroll)
            if (frame) cancelAnimationFrame(frame)
        }
    }, [headings])

    const index = Math.max(0, headings.findIndex((h) => h.id === active))
    const seg = geo?.segments[index]

    return (
        <div>
            <p className="text-xs font-medium leading-5 text-boli-muted">On this page</p>
            <ul ref={listRef} className="relative mt-3">
                {geo && seg ? (
                    <svg aria-hidden className="pointer-events-none absolute left-0 top-0 overflow-visible" width={LINE_X[3] + 2} height={geo.height}>
                        <path d={geo.d} fill="none" className="stroke-boli-line" strokeWidth={1.5} strokeLinejoin="round" />
                        <path
                            d={geo.d}
                            fill="none"
                            className="stroke-boli-ink transition-[stroke-dasharray,stroke-dashoffset] duration-300 ease-out motion-reduce:transition-none"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ strokeDasharray: `${Math.max(0, seg.end - seg.start)} ${geo.total + 1}`, strokeDashoffset: -seg.start }}
                        />
                    </svg>
                ) : null}
                {headings.map((h) => {
                    const on = h.id === active
                    const nested = h.depth === 3
                    return (
                        <li key={h.id} data-toc-item data-depth={nested ? 3 : 2}>
                            <a
                                href={`#${h.id}`}
                                onClick={() => setActive(h.id)}
                                aria-current={on ? "location" : undefined}
                                className={cn(
                                    "block cursor-pointer py-1.5 text-sm leading-5 transition-colors",
                                    nested ? "pl-7 text-[13px]" : "pl-4",
                                    on ? "font-medium text-boli-ink" : "text-boli-muted hover:text-boli-ink",
                                )}
                            >
                                {h.title}
                            </a>
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}
