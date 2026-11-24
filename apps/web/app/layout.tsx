import type { Metadata, Viewport } from "next"
import "./boli.css"
import "@repo/brand/art/art.css"
import { SITE } from "@repo/core/site"
import { fraunces, geistMono, instrumentSans } from "./fonts"
import { Providers } from "./providers"
import { JsonLd } from "@/components/json-ld"
import { organizationSchema, websiteSchema } from "@/lib/schema"

/**
 * The public site (bolihq.com): landing, About, Contact, Docs, Terms, Privacy. Light only (owner, 2026-11-24). No auth:
 * the app is its own origin (apps/main), reached through lib/app-links.ts. SITE.url is THIS site (NEXT_PUBLIC_SITE_URL).
 */
export const metadata: Metadata = {
    metadataBase: new URL(SITE.url),
    title: { default: SITE.name, template: `%s | ${SITE.name}` },
    description: SITE.description,
    applicationName: SITE.name,
    openGraph: {
        type: "website",
        locale: "en_US",
        url: SITE.url,
        siteName: SITE.name,
        title: `${SITE.name} - ${SITE.tagline}`,
        description: SITE.description,
    },
    twitter: {
        card: "summary_large_image",
        title: `${SITE.name} - ${SITE.tagline}`,
        description: SITE.description,
    },
    robots: { index: true, follow: true },
}

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    colorScheme: "light",
    themeColor: "#f7f5f3",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en" suppressHydrationWarning className={`${instrumentSans.variable} ${fraunces.variable} ${geistMono.variable}`}>
            <body className="bg-background font-sans text-foreground antialiased">
                <JsonLd data={[organizationSchema(), websiteSchema()]} />
                <Providers>{children}</Providers>
            </body>
        </html>
    )
}
