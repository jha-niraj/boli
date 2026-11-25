import { BoliAppLoader } from "@repo/brand/loaders/full-page"

/** What the console says while a page with no loading.tsx of its own opens (every main page has one). */
const ADMIN_LOADER_LINES = ["Opening the console", "Gathering the numbers", "Checking on the bots", "Almost there"] as const

/**
 * Fallback for a route without its own loading.tsx: the same Boli thread loader as apps/main, beside the rail. Every
 * functional page has its own loading.tsx drawn to its layout (AGENTS.md section 10), so this shows only for a route
 * that has none.
 */
export default function Loading() {
    return <BoliAppLoader fullScreen={false} lines={ADMIN_LOADER_LINES} />
}
