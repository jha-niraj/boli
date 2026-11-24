"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "@repo/ui/components/themeprovider"
import { TooltipProvider } from "@repo/ui/components/ui/tooltip"
import { Toaster } from "@repo/ui/components/ui/toast"

/**
 * The sign-in landing (`/`) and the invitation page (`/join`) are light only, like apps/main's auth pages; the console
 * follows the person's theme.
 */
function isLightOnly(pathname: string): boolean {
    return pathname === "/" || pathname === "/join" || pathname.startsWith("/join/")
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
