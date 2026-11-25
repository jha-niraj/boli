import "server-only"

import gurukulhq from "../../../ml/jawaf-eval/questions/gurukulhq.json"
import type { EvalQuestion } from "@/types/jawaf"

/**
 * The quality-check question sets (ml/jawaf-eval/questions/*.json - the same files the CLI runner uses), keyed by the
 * bot's public page name. A bot without a set cannot be checked yet: write questions/<site>.json from the pages the
 * bot read (ml/jawaf-eval/README.md) and add it here.
 */
const SETS: { slug: string; questions: EvalQuestion[] }[] = [gurukulhq as { slug: string; questions: EvalQuestion[] }]

export function evalSetFor(slug: string): EvalQuestion[] | null {
    return SETS.find((s) => s.slug === slug)?.questions ?? null
}
