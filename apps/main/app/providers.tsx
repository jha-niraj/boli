"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "@repo/ui/components/themeprovider"
import { TooltipProvider } from "@repo/ui/components/ui/tooltip"
import { Toaster } from "@repo/ui/components/ui/toast"

/**
 * Auth and welcome pages are designed light-first and always render light (owner, 2026-11-24); the signed-in app follows
 * the person's theme. The public pages live in apps/web (light only there). A Jawaf page (`/j/<slug>`) belongs to the
 * business: <html> stays light and the page applies the bot's own light / dark / system setting on its root
 * (components/jawaf/public/theme-root.tsx), never the visitor's Boli preference.
 */
const LIGHT_ONLY = ["/signin", "/signup", "/verifyemail", "/forgotpassword", "/resetpassword", "/welcome", "/j"]
function isLightOnly(pathname: string): boolean {
    return LIGHT_ONLY.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

/**
 * The app's client providers: ONE QueryClient (AGENTS.md section 11 defaults), the theme, one tooltip provider and ONE
 * toaster (top-right).
 */
function makeQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 60_000,
                gcTime: 5 * 60_000,
                refetchOnWindowFocus: false,
                retry: 1,
            },
        },
    })
}

export function Providers({ children }: { children: React.ReactNode }) {
    // One client per browser tab, created once (useState, not module scope, so the server never shares one).
    const [queryClient] = React.useState(makeQueryClient)
    const pathname = usePathname() ?? "/"
    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange forcedTheme={isLightOnly(pathname) ? "light" : undefined}>
                <TooltipProvider delayDuration={250}>
                    {children}
                    <Toaster position="top-right" />
                </TooltipProvider>
            </ThemeProvider>
        </QueryClientProvider>
    )
}
