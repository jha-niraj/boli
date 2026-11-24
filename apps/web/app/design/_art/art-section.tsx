import { R2Head } from "../_parts/r2-head"
import { sans, serif } from "../_parts/t1"
import { ArtFrame } from "./frame"
import { KuraScene } from "./kura/kura-scene"
import { PixelStory } from "./story/pixel-story"
import { TeamSection } from "./team/team"
import { ValleyHero } from "./valley/valley"

/*
 * The Art tab (round 3): P1-V3 day and golden hour, the story scenes, Team v2 and the Kura scene - one kit, one
 * palette, one set of rules (_art/RESEARCH.md). All motion stops and every scene shows finished under
 * prefers-reduced-motion (`art.css`).
 */
export function ArtSection() {
    return (
        <div className="art-root grid gap-0" style={sans()}>
            <header className="grid gap-5 pb-14">
                <p className="text-xs text-boli-muted">Art - round 3, 24 Nov 2026</p>
                <h2 className="max-w-3xl text-[48px] leading-[1.02] text-boli-ink sm:text-[64px]" style={serif(340, 144, "-0.04em")}>
                    The valley, clearer
                </h2>
                <p className="max-w-2xl text-[15px] leading-7 text-boli-text">
                    People half again as tall with real faces - brows, eyes with a catchlight, a mouth, a blush - one clothing colour each and coloured outlines. Bubbles in a
                    drawn pixel font with a two-pixel border and a shadow. Ridges on perfect slopes, no stray pixels, one hue-shifted palette for day and golden hour.
                </p>
            </header>
            <div className="grid gap-24">
                <section id="art-valley" className="grid scroll-mt-28 gap-8">
                    <R2Head
                        n="01"
                        title="P1-V3 - the valley"
                        line="Same cast and places: the range, the stupa with its flags, the pagoda, houses with smoke, clouds, birds, the sun, the pasal and the four people - plus Boudha's pigeons. The speakers take turns (16s): student, developer, shopkeeper, elder."
                        codes="P1-V3 day, P1-V3 golden"
                    />
                    <ArtFrame code="P1-V3 day" title="Landing hero, wide" use="Sits on the fold of the full-screen hero at its natural 160:84; the hero ground above it is the valley's own top sky colour.">
                        <ValleyHero variant="day" preserve="xMidYMid meet" className="block aspect-[160/84] w-full" />
                    </ArtFrame>
                    <ArtFrame code="P1-V3 golden" title="Golden hour, wide" use="The same scene at dusk: alpenglow on the snow, a low sun, violet shadows.">
                        <ValleyHero variant="gold" preserve="xMidYMid meet" className="block aspect-[160/84] w-full" />
                    </ArtFrame>
                    <div className="flex flex-wrap items-start gap-6">
                        <ArtFrame code="P1-V3 day" title="Phone crop, 390px" use="The portrait layout (96 x 120): two rows of people, one bubble at a time." className="w-[390px] max-w-full">
                            <ValleyHero variant="day" crop="portrait" preserve="xMidYMid meet" className="block aspect-[96/120] w-full" />
                        </ArtFrame>
                        <ArtFrame code="P1-V3 golden" title="Auth right panel" use="The same portrait crop at golden hour, as it fills the sign-in panel (720 x 900)." className="w-[480px] max-w-full">
                            <ValleyHero variant="gold" crop="portrait" preserve="xMidYMid meet" className="block aspect-[96/120] w-full" />
                        </ArtFrame>
                    </div>
                </section>

                <section id="art-story" className="grid scroll-mt-28 gap-8">
                    <R2Head
                        n="02"
                        title="Story scenes"
                        line="The About story in four scenes from the same world and kit, at 96 x 60: the student at the broken bridge, the overheating laptop, the Boli house taking requests, everyone wired to it. Outline first, then fill, row by row."
                        codes="PS1, PS2"
                    />
                    <PixelStory />
                </section>

                <TeamSection n="03" />

                <section id="art-kura" className="grid scroll-mt-28 gap-8">
                    <R2Head
                        n="04"
                        title="Kura scene"
                        line="Kura means conversation, so the empty state shows one: the elder asks, the student answers, by the stupa. Day in light mode, golden hour in dark. Used in K1 v2 on the Screens tab."
                        codes="KS1"
                    />
                    <div className="grid gap-6 md:grid-cols-2">
                        <ArtFrame code="KS1" title="Light mode" use="Above Kura's welcome, about 3x.">
                            <KuraScene variant="day" className="block aspect-[112/48] w-full" />
                        </ArtFrame>
                        <ArtFrame code="KS1" title="Dark mode" use="The dusk palette, so it glows on near-black.">
                            <KuraScene variant="gold" className="block aspect-[112/48] w-full" />
                        </ArtFrame>
                    </div>
                </section>
            </div>
        </div>
    )
}
