"use client"

import "./boli.css"
import "@/components/art/art.css"
import { BoliErrorView } from "@/components/status/error-view"
import { fraunces, geistMono, instrumentSans } from "./fonts"

/**
 * The last boundary: the root layout itself failed, so this draws its own <html> and <body> (with Boli's CSS and fonts)
 * and shows St2, the hot laptop, full screen. classifyError still decides the copy; Try again re-renders the root.
 */
export default function GlobalError(props: { error: Error & { digest?: string }; reset: () => void }) {
    return (
        <html lang="en" className={`${instrumentSans.variable} ${fraunces.variable} ${geistMono.variable}`}>
            <body className="bg-background font-sans text-foreground antialiased">
                <BoliErrorView {...props} fullScreen />
            </body>
        </html>
    )
}
