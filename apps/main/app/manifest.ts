import type { MetadataRoute } from "next"
import { SITE } from "@repo/core/site"

/**
 * Icons: the R2 "Bo-li" mark on a near-black tile (192 and 512 in /public, made from components/brand/boli-mark.tsx's
 * geometry) - list each with its true size, never a size the file is not. The tab icon is app/icon.svg (it switches
 * ink for dark tabs) with app/favicon.ico as the fallback; iOS uses app/apple-icon.png.
 */
export default function manifest(): MetadataRoute.Manifest {
    return {
        name: SITE.name,
        short_name: SITE.name,
        description: SITE.description,
        start_url: "/kura",
        display: "standalone",
        background_color: "#f7f5f3",
        theme_color: "#f7f5f3",
        icons: [
            { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
            { src: "/favicon.ico", sizes: "32x32", type: "image/x-icon" },
        ],
    }
}
