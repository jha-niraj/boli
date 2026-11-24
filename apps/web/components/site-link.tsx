import { forwardRef, type ComponentPropsWithoutRef } from "react"
import { AppLink } from "@repo/ui/components/app-link"

/**
 * One link for lists that mix this site's pages with the app's (the nav, the footer, product cards). An absolute URL -
 * the app on its own origin, built with lib/app-links.ts - is a plain `<a>` in the same tab (owner, 2026-11-24): next/link
 * cannot navigate across origins. A path on this site stays an AppLink (prefetch on intent, the pending bar).
 */
export type SiteLinkProps = Omit<ComponentPropsWithoutRef<"a">, "href"> & { href: string }

export const SiteLink = forwardRef<HTMLAnchorElement, SiteLinkProps>(function SiteLink({ href, ...rest }, ref) {
    if (/^https?:\/\//.test(href)) return <a ref={ref} href={href} {...rest} />
    return <AppLink ref={ref} href={href} {...rest} />
})
