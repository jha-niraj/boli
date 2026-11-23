import type { MetadataRoute } from "next"
import { SITE } from "@repo/core/site"

/** Icons: add real PNGs (192 and 512) to /public and list them with their true sizes - never a size the file is not. */
export default function manifest(): MetadataRoute.Manifest {
    return {
        name: SITE.name,
        short_name: SITE.name,
        description: SITE.description,
        start_url: "/kura",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#ffffff",
        icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
    }
}
