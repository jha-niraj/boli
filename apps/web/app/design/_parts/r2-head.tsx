import { serif } from "./t1"

/** Round 2 section opener, set in T1: number, Fraunces Soft title, one line, the codes to answer with. */
export function R2Head({ n, title, line, codes }: { n: string; title: string; line: string; codes?: string }) {
    return (
        <header className="grid gap-3 border-b border-boli-line pb-6 sm:grid-cols-[3rem_1fr_auto] sm:items-end sm:gap-x-4">
            <span className="font-mono text-xs text-boli-muted sm:pb-2">{n}</span>
            <div className="min-w-0">
                <h2 className="text-[34px] leading-[1.05] text-boli-ink sm:text-[40px]" style={serif(380, 96, "-0.028em")}>
                    {title}
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-boli-text">{line}</p>
            </div>
            {codes ? <p className="text-xs text-boli-muted sm:pb-2">Answer with: {codes}</p> : null}
        </header>
    )
}
