"use client"

import * as React from "react"
import { ThemeProvider } from "@repo/ui/components/themeprovider"
import { TooltipProvider } from "@repo/ui/components/ui/tooltip"
import { Toaster } from "@repo/ui/components/ui/toast"

/**
 * The site's client providers: the theme forced to light (every public page is designed light-first - owner,
 * 2026-11-24), one tooltip provider and ONE toaster (top-right). No QueryClient: no page here reads on the client.
 */
export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light" enableSystem={false} disableTransitionOnChange>
            <TooltipProvider delayDuration={250}>
                {children}
                <Toaster position="top-right" />
            </TooltipProvider>
        </ThemeProvider>
    )
}
