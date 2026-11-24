import { cn } from "@repo/ui/lib/utils"
import { EditorialFaq } from "@repo/brand/editorial-faq"
import { DISPLAY } from "@repo/brand/type"
import type { ContentFaq } from "@/lib/content-shared"

/** The anchor of the questions section (also added to the "On this page" line). */
export const FAQ_ANCHOR = "questions"
export const FAQ_TITLE = "Questions"

/**
 * The questions a piece answers (frontmatter `faqs`), at the end of the article, in the editorial FAQ. The page emits
 * the same list as FAQPage JSON-LD - visible text and structured data always match.
 */
export function ContentFaqSection({ items, className }: { items: readonly ContentFaq[]; className?: string }) {
    if (!items.length) return null
    return (
        <section aria-labelledby={FAQ_ANCHOR} className={cn("mt-16", className)}>
            <h2 id={FAQ_ANCHOR} className="scroll-mt-24 font-serif text-[28px] leading-[1.15] text-boli-ink sm:text-[32px]" style={DISPLAY.h3}>
                {FAQ_TITLE}
            </h2>
            <EditorialFaq items={items.map((f) => ({ q: f.q, a: f.a }))} questionStyle={DISPLAY.h3} className="mt-6 font-sans" />
        </section>
    )
}
