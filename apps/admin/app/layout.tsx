import type { Metadata, Viewport } from "next"
import "./boli.css"
import "@repo/brand/art/art.css"
import "./editor.css"
import { BRAND } from "@repo/boli"
import { fraunces, geistMono, instrumentSans } from "./fonts"
import { Providers } from "./providers"

/** The internal console. Same Boli look as apps/main (fonts, sky, pills, logo); never indexed. */
export const metadata: Metadata = {
    title: { default: `${BRAND.name} Admin`, template: `%s | ${BRAND.name} Admin` },
    description: `The ${BRAND.name} admin console - team, access, users, audit and system settings. For the ${BRAND.name} team.`,
    applicationName: `${BRAND.name} Admin`,
    robots: { index: false, follow: false },
}

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    // The phone tab bar pads itself by env(safe-area-inset-bottom); that needs viewport-fit=cover.
    viewportFit: "cover",
    themeColor: [
        { media: "(prefers-color-scheme: light)", color: "#f7f5f3" },
        { media: "(prefers-color-scheme: dark)", color: "#121314" },
    ],
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en" suppressHydrationWarning className={`${instrumentSans.variable} ${fraunces.variable} ${geistMono.variable}`}>
            <body className="bg-background font-sans text-foreground antialiased dark:bg-[#121314] dark:text-neutral-100">
                <Providers>{children}</Providers>
            </body>
        </html>
    )
}
