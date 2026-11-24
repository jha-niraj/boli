import { SITE } from "@repo/core/site"

/** A bot's public chat page: this app's origin + /j/<slug> (app.bolihq.com/j/<name>). */
export function jawafPublicUrl(slug: string): string {
    return `${SITE.url.replace(/\/+$/, "")}/j/${slug}`
}

/** The same without the scheme, for display ("app.bolihq.com/j/<name>"). */
export function jawafPublicLabel(slug: string): string {
    return jawafPublicUrl(slug).replace(/^https?:\/\//, "")
}
