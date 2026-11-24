"use client"

import { type RefObject, useEffect, useRef, useState } from "react"

/** The About story, one line per step. Shared by the story scenes and the landing wireframe. */
export const STORY = [
    { n: "01", title: "The gap", text: "There was no open, hosted model that speaks the way Nepal types - Romanized Nepali, English, both in one line." },
    {
        n: "02",
        title: "Open models exist, but need running",
        text: "The weights are free. Servers, memory and updates are not - and nobody runs a business on a model on their own laptop.",
    },
    { n: "03", title: "Boli runs them for you", text: "We fine-tune, host and keep the model running, and price it in rupees." },
    { n: "04", title: "Anyone builds on it", text: "A student, a shop or a developer anywhere in Nepal gets a key in a minute and builds." },
] as const

/** Sets `on` once the element is a third in view. With reduced motion the CSS shows the finished scene anyway. */
export function useOnView<T extends Element>(): [RefObject<T | null>, boolean] {
    const ref = useRef<T | null>(null)
    const [on, setOn] = useState(false)
    useEffect(() => {
        const el = ref.current
        if (!el || on) return
        if (typeof IntersectionObserver === "undefined") {
            setOn(true)
            return
        }
        const io = new IntersectionObserver(
            (entries) => {
                if (entries.some((e) => e.isIntersecting)) {
                    setOn(true)
                    io.disconnect()
                }
            },
            { threshold: 0.35 },
        )
        io.observe(el)
        return () => io.disconnect()
    }, [on])
    return [ref, on]
}
