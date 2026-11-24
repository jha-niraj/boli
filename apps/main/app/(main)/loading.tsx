import { BoliAppLoader } from "@/components/loaders/full-page"

/**
 * Fallback for a route without its own loading.tsx: F1, the thread drawing itself, beside the rail. Every functional
 * page has its own loading.tsx drawn to its layout (AGENTS.md section 10), so this shows only for a route that has none.
 */
export default function Loading() {
    return <BoliAppLoader fullScreen={false} />
}
