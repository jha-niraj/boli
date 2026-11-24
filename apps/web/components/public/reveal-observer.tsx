"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import "./reveal.css"

/**
 * Drives `data-reveal` (reveal.css). Mounted once by PublicShell; renders nothing. After hydration, and only when the
 * visitor allows motion: whatever is already on screen is marked shown, then `data-reveal-on` goes on <html>, then an
 * IntersectionObserver marks each remaining element once as it scrolls in. Re-scans on a client navigation between
 * public pages (the shell stays mounted), and watches for elements mounted later (a streamed block), so nothing marked
 * stays hidden. Without JS, or with reduced motion, nothing is ever hidden.
 */
export function RevealObserver() {
    const pathname = usePathname()
    useEffect(() => {
        const root = document.documentElement
        if (typeof IntersectionObserver === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            root.removeAttribute("data-reveal-on")
            return
        }
        const pending = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]:not([data-shown])"))
        const vh = window.innerHeight
        for (const el of pending) {
            const r = el.getBoundingClientRect()
            if (r.top < vh && r.bottom > 0) el.setAttribute("data-shown", "")
        }
        root.setAttribute("data-reveal-on", "")
        const io = new IntersectionObserver(
            (entries) => {
                for (const e of entries) {
                    if (!e.isIntersecting) continue
                    e.target.setAttribute("data-shown", "")
                    io.unobserve(e.target)
                }
            },
            { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
        )
        for (const el of pending) if (!el.hasAttribute("data-shown")) io.observe(el)
        const mo = new MutationObserver((records) => {
            for (const rec of records) {
                rec.addedNodes.forEach((node) => {
                    if (!(node instanceof HTMLElement)) return
                    const found = node.matches("[data-reveal]") ? [node] : []
                    found.push(...Array.from(node.querySelectorAll<HTMLElement>("[data-reveal]")))
                    for (const el of found) if (!el.hasAttribute("data-shown")) io.observe(el)
                })
            }
        })
        mo.observe(document.body, { childList: true, subtree: true })
        return () => {
            io.disconnect()
            mo.disconnect()
        }
    }, [pathname])
    return null
}
