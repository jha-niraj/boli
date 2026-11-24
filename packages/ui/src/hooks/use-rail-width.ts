"use client"

import * as React from "react"
import { RAIL_WIDTH, railWidthCookie } from "../lib/shell"

/** The rail width while pinned: dragged with the pointer or the arrow keys, kept in a cookie for the server. */
export function useRailWidth(cookieName: string, initial?: number) {
    const [width, setWidth] = React.useState(initial ?? RAIL_WIDTH.default)
    const [dragging, setDragging] = React.useState(false)
    const save = React.useCallback((w: number) => {
        document.cookie = `${railWidthCookie(cookieName)}=${w}; path=/; max-age=31536000; samesite=lax`
    }, [cookieName])
    const clamp = (w: number) => Math.min(RAIL_WIDTH.max, Math.max(RAIL_WIDTH.min, Math.round(w)))

    const onPointerDown = React.useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (e.button !== 0) return
        e.preventDefault()
        const startX = e.clientX
        const startW = width
        let last = startW
        setDragging(true)
        const move = (ev: PointerEvent) => {
            // A lost pointerup (window blur, a second button) must not keep the drag alive.
            if (ev.buttons === 0) { stop(); return }
            last = clamp(startW + ev.clientX - startX)
            setWidth(last)
        }
        const stop = () => {
            window.removeEventListener("pointermove", move)
            window.removeEventListener("pointerup", stop)
            window.removeEventListener("blur", stop)
            setDragging(false)
            save(last)
        }
        window.addEventListener("pointermove", move)
        window.addEventListener("pointerup", stop)
        window.addEventListener("blur", stop)
    }, [width, save])

    const reset = React.useCallback(() => { setWidth(RAIL_WIDTH.default); save(RAIL_WIDTH.default) }, [save])
    const onKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return
        e.preventDefault()
        const next = clamp(width + (e.key === "ArrowRight" ? 16 : -16))
        setWidth(next)
        save(next)
    }, [width, save])

    return { width, dragging, onPointerDown, reset, onKeyDown }
}
