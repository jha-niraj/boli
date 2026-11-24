import { QuietBadge } from "@repo/brand/quiet-badge"

/** Shown on a draft in development only (production never lists or builds drafts). */
export function DraftBadge({ draft }: { draft: boolean }) {
    if (!draft) return null
    return <QuietBadge tone="outline">Draft</QuietBadge>
}
