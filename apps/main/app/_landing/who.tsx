import { Code2, GraduationCap, Rocket, Store } from "lucide-react"
import { cn } from "@repo/ui/lib/utils"
import { DISPLAY } from "@/components/brand/type"
import { Band, Kicker, SectionTitle } from "@/components/public/section"
import { SKY_TEXT } from "@/components/public/tokens"
import { WELCOME_CREDITS } from "@/lib/boli"

const WHO = [
    { icon: Code2, title: "Developers", line: "Swap the base URL in the OpenAI SDK and ship a Nepali feature today." },
    { icon: GraduationCap, title: "Students", line: `${WELCOME_CREDITS} free credits go a long way on a small open model.` },
    { icon: Rocket, title: "Startups", line: "Rupee pricing you can put in a budget, and no closed model underneath." },
    { icon: Store, title: "Shops and teams", line: "Answer customers in the language they wrote in - Romanized, Devanagari or mixed." },
] as const

/** Who it's for: four columns on a hairline (two on a tablet, one on a phone). */
export function Who() {
    return (
        <Band id="who" tone="white" labelledBy="who-title">
            <Kicker>Who it&apos;s for</Kicker>
            <SectionTitle>
                <span id="who-title">Built for people building in Nepal</span>
            </SectionTitle>
            <ul className="mt-12 grid border-t border-boli-line sm:mt-14 sm:grid-cols-2 lg:grid-cols-4">
                {WHO.map((w, i) => (
                    <li
                        key={w.title}
                        className={cn(
                            "grid content-start gap-3 border-b border-boli-line py-7 sm:pr-8 lg:border-b-0 lg:py-8",
                            i > 0 && "lg:border-l lg:pl-8",
                            i % 2 === 1 && "sm:border-l sm:pl-8",
                        )}
                    >
                        <w.icon aria-hidden strokeWidth={1.5} className={cn("size-5", SKY_TEXT)} />
                        <h3 className="text-2xl leading-tight text-boli-ink" style={DISPLAY.card}>
                            {w.title}
                        </h3>
                        <p className="text-sm leading-6 text-boli-text">{w.line}</p>
                    </li>
                ))}
            </ul>
        </Band>
    )
}
