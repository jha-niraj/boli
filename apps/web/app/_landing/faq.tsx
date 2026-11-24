import { FaqSection } from "@/components/public/faq-section"
import { Band } from "@/components/public/section"

/** FAQ2: editorial list, the left column sticky while the questions scroll. */
export function Faq() {
    return (
        <Band id="faq" labelledBy="faq-title">
            <FaqSection />
        </Band>
    )
}
