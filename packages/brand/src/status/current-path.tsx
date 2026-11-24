"use client"

import { usePathname } from "next/navigation"

/** The path the person asked for, read on the client (a not-found page is not given it). Empty until mounted on a static render. */
export function CurrentPath() {
    const pathname = usePathname()
    return <>{pathname ?? ""}</>
}
