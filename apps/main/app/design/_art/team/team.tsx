import { QuietBadge } from "../../_components/quiet-badge"
import { R2Head } from "../../_parts/r2-head"
import { C5 } from "../../_parts/sky"
import { sans, serif } from "../../_parts/t1"
import { Pixels, PixelSvg } from "../pixel/pixels"
import { VALLEY_DAY } from "../valley/palette"
import { PORTRAIT_H, PORTRAIT_W, TEAM_SCENES, type TeamRole } from "./portraits"

/*
 * TM2 - the About team section with pixel portraits in role scenes (replaces TM1's generated faces). Placeholder
 * people only; the section ships hidden behind a flag until real names exist.
 */

const ROLES: readonly { id: TeamRole; role: string; line: string }[] = [
    { id: "founder", role: "Founder", line: "Sets the direction, writes the first draft of everything and answers the support email." },
    { id: "ml", role: "ML engineer", line: "Picks, quantizes and evaluates the open models, and keeps the GPUs busy." },
    { id: "designer", role: "Designer", line: "Draws the pixels, the pages and the thread." },
    { id: "community", role: "Community", line: "Runs the meetups, reads every message and brings back what people ask for." },
]

/** One portrait scene, crisp at any size. */
export function TeamPortrait({ role, className }: { role: TeamRole; className?: string }) {
    const scene = TEAM_SCENES[role]
    return (
        <PixelSvg w={PORTRAIT_W} h={PORTRAIT_H} label={scene.label} className={className}>
            <Pixels grid={scene.grid} palette={VALLEY_DAY} />
            {scene.overlays.map((o, i) => (
                <Pixels key={i} grid={o.grid} palette={VALLEY_DAY} x={o.x} y={o.y} className="art-blink" style={{ "--art-dur": `${o.dur}s` }} />
            ))}
        </PixelSvg>
    )
}

export function TeamSection({ n = "03" }: { n?: string }) {
    return (
        <section id="art-team" className="grid scroll-mt-28 gap-8">
            <R2Head
                n={n}
                title="Team v2 - for About"
                line="Placeholder people as pixel portraits in the valley's style, each in a small scene that says what they do: code at a desk, a GPU rack, a sketchbook, a chautari. Names and roles in T1 below. Hidden behind a flag until real people and names exist."
                codes="TM2"
            />
            <div className="rounded-3xl border border-boli-line bg-boli-ground p-5 sm:p-10">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-sm" style={{ ...sans(450), color: C5.text }}>
                            Team
                        </p>
                        <h3 className="mt-3 text-[44px] leading-[1.02] text-boli-ink" style={serif(360, 144, "-0.035em")}>
                            The people behind Boli
                        </h3>
                    </div>
                    <QuietBadge tone="outline">Hidden behind a flag until real</QuietBadge>
                </div>
                <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4">
                    {ROLES.map((r) => (
                        <article key={r.id} className="grid content-start gap-3">
                            <div className="overflow-hidden rounded-2xl border border-boli-line bg-white">
                                <TeamPortrait role={r.id} className="block aspect-square w-full" />
                            </div>
                            <div>
                                <p className="text-[19px] leading-tight text-boli-ink" style={serif(420, 24, "-0.01em")}>
                                    Your name here
                                </p>
                                <p className="mt-0.5 text-xs" style={{ ...sans(450), color: C5.text }}>
                                    {r.role}
                                </p>
                                <p className="mt-2 text-xs leading-5 text-boli-text">{r.line}</p>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    )
}
