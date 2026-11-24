import { DISPLAY, serif } from "../../type"
import { ArtRoot } from "../art-root"
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

/**
 * The About team section: eyebrow, headline, four portraits with name, role and one line. Placeholder people only - the
 * page ships it hidden behind a flag until real names exist.
 */
export function TeamSection({ className }: { className?: string }) {
    return (
        <ArtRoot className={className}>
            <p className="text-sm font-medium text-boli-sky-ink">Team</p>
            <h2 className="mt-3 text-4xl leading-[1.02] text-boli-ink sm:text-[44px]" style={DISPLAY.display}>
                The people behind Boli
            </h2>
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
                            <p className="mt-0.5 text-xs font-medium text-boli-sky-ink">{r.role}</p>
                            <p className="mt-2 text-xs leading-5 text-boli-text">{r.line}</p>
                        </div>
                    </article>
                ))}
            </div>
        </ArtRoot>
    )
}
