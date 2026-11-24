"use client"

import { useState } from "react"
import { Label } from "@repo/ui/components/ui/label"
import { Switch } from "@repo/ui/components/ui/switch"
import { sans, serif } from "../_parts/t1"
import { EmptyBoard } from "./empty"
import { FullPageBoard } from "./full-page"
import { GroupHead, StillProvider } from "./kit"
import { SkeletonBoard } from "./skeletons"
import { SpinnersBoard } from "./spinners"
import { StatusBoard } from "./status"
import "./loaders.css"

/*
 * The Loaders tab (owner brief, 2026-11-24): REVIEW SAMPLES, not production. The dot-matrix loader goes; these are the
 * options for what replaces it - spinners, full-page loaders, status screens, empty states and the skeleton tone.
 * Every option has a code to answer with. Nothing in packages/ui or the app changes until the owner picks.
 */

const JUMPS = [
    { id: "ld-spinners", label: "Spinners S1-S6" },
    { id: "ld-full", label: "Full page F1-F6, N1" },
    { id: "ld-status", label: "Status St1-St4" },
    { id: "ld-empty", label: "Empty E1-E6" },
    { id: "ld-skeleton", label: "Skeleton K1" },
]

export function LoadersSection() {
    const [still, setStill] = useState(false)
    return (
        <div className="grid gap-0" style={sans()}>
            <header className="grid gap-5 pb-14">
                <p className="text-xs text-boli-muted">Loaders - review samples, 24 Nov 2026</p>
                <h2 className="max-w-3xl text-[48px] leading-[1.02] text-boli-ink sm:text-[64px]" style={serif(340, 144, "-0.04em")}>
                    Waiting, made Boli
                </h2>
                <p className="max-w-2xl text-[15px] leading-7 text-boli-text">
                    A simple and a dotted spinner for controls, full-page loaders about the product, the 404 / 500 / 403 / resting screens, empty
                    states and the skeleton tone - each in light and dark. Answer with the codes; nothing ships until you pick.
                </p>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                    <nav aria-label="Loaders sections" className="flex flex-wrap gap-2">
                        {JUMPS.map((j) => (
                            <a
                                key={j.id}
                                href={`#${j.id}`}
                                className="inline-flex h-8 cursor-pointer items-center rounded-full border border-boli-line bg-white px-3.5 text-[13px] text-boli-text transition-colors hover:border-[#d6d0c8] hover:text-boli-ink"
                                style={sans(450)}
                            >
                                {j.label}
                            </a>
                        ))}
                    </nav>
                    <div className="flex items-center gap-2.5">
                        <Switch id="ld-still" checked={still} onCheckedChange={setStill} className="cursor-pointer" />
                        <Label htmlFor="ld-still" className="cursor-pointer text-[13px] text-boli-text" style={sans(450)}>
                            Preview reduced motion
                        </Label>
                    </div>
                </div>
            </header>
            <StillProvider still={still}>
                <div className="grid gap-24">
                    <section className="grid gap-8">
                        <GroupHead
                            id="ld-spinners"
                            n="01"
                            title="Spinners"
                            line="For a control's own action and for a region with no shape. Shown at 14, 16, 20 and 32px, inside a pill and beside text. They take the colour of what holds them."
                            codes="S1-S6"
                        />
                        <SpinnersBoard />
                    </section>
                    <section className="grid gap-8">
                        <GroupHead
                            id="ld-full"
                            n="02"
                            title="Full-page loaders"
                            line="What a whole route shows while it loads (the AppLoader slot), each about the product, with a line that changes every two seconds. Then the route bar."
                            codes="F1-F6, N1"
                        />
                        <FullPageBoard />
                    </section>
                    <section className="grid gap-8">
                        <GroupHead
                            id="ld-status"
                            n="03"
                            title="Status screens"
                            line="404, 500, 403 and the model resting: a pixel scene, the code, a title, one line, the path you asked for, two actions. Then all of them at 390px."
                            codes="St1a or St1b, St2, St3, St4"
                        />
                        <StatusBoard />
                    </section>
                    <section className="grid gap-8">
                        <GroupHead
                            id="ld-empty"
                            n="04"
                            title="Empty states"
                            line="The dashboard's nothing-yet moments, inside a real card: a small pixel icon on a Dhaka-hemmed tile, a title, one line, one action."
                            codes="E1-E6 (keep or change each)"
                        />
                        <EmptyBoard />
                    </section>
                    <section className="grid gap-8">
                        <GroupHead
                            id="ld-skeleton"
                            n="05"
                            title="Skeleton tone"
                            line="One Balance card skeleton three ways: today's shared style next to two warm Boli versions (sand, pill-round lines, no blue)."
                            codes="K1a, K1b or K1c"
                        />
                        <SkeletonBoard />
                    </section>
                </div>
            </StillProvider>
        </div>
    )
}
