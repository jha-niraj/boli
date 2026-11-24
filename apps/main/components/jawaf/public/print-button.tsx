"use client"

import { Printer } from "lucide-react"
import { PillButton } from "@repo/brand/pill-button"

/** Opens the browser's print dialog for the poster (hidden when printing). */
export function PrintButton() {
    return (
        <PillButton type="button" size="md" onClick={() => window.print()} className="cursor-pointer print:hidden">
            <Printer aria-hidden strokeWidth={1.75} /> Print poster
        </PillButton>
    )
}
