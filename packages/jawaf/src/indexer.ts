import { and, db, eq, inArray } from "@repo/db"
import { jawafChunk, jawafFactSection, jawafNote, jawafQa } from "@repo/db/schema"
import type { JawafOriginKind } from "@repo/boli/jawaf"
import { embed } from "./embed"
import { chunkMarkdown, estimateTokens, tableToText, type TextChunk } from "./text"

/**
 * Indexing: an origin (a page, a file's text, a fact section, a Q&A pair, a note) -> jawaf_chunk rows. Re-indexing an
 * origin embeds first (the slow part, outside any write), then deletes its old chunks and inserts the new ones in ONE
 * db.batch, so search never sees a half-indexed origin. Auto-apply: facts, Q&A and notes are indexed on save (seconds).
 */

export interface IndexPiece extends TextChunk {
    /** What is embedded when it differs from heading + text (a Q&A phrasing is embedded alone). */
    embedText?: string
}

export interface IndexTarget {
    workspaceId: string
    botId: string
    kind: JawafOriginKind
    originId: string
    sourceId?: string | null
}

/** Replace an origin's chunks. Returns how many were written. Throws AppError when embedding fails (nothing changes). */
export async function indexOrigin(target: IndexTarget, pieces: IndexPiece[]): Promise<number> {
    const vectors = await embed(pieces.map((p) => p.embedText ?? (p.heading ? `${p.heading}\n${p.text}` : p.text)))
    const del = db.delete(jawafChunk).where(and(eq(jawafChunk.botId, target.botId), eq(jawafChunk.originKind, target.kind), eq(jawafChunk.originId, target.originId)))
    if (!pieces.length) {
        await del
        return 0
    }
    const rows = pieces.map((p, i) => ({
        workspaceId: target.workspaceId,
        botId: target.botId,
        originKind: target.kind,
        originId: target.originId,
        sourceId: target.sourceId ?? null,
        heading: p.heading.slice(0, 500),
        text: p.text,
        seq: i,
        tokens: p.tokens,
        embedding: vectors[i]!,
    }))
    // Neon HTTP caps a request body; insert in slices of 40 rows inside the same batch.
    const inserts = []
    for (let i = 0; i < rows.length; i += 40) inserts.push(db.insert(jawafChunk).values(rows.slice(i, i + 40)))
    await db.batch([del, ...inserts] as [typeof del, ...typeof inserts])
    return rows.length
}

/** Remove every chunk of the given origins. */
export async function unindex(botId: string, kind: JawafOriginKind, originIds: string[]): Promise<void> {
    if (!originIds.length) return
    await db.delete(jawafChunk).where(and(eq(jawafChunk.botId, botId), eq(jawafChunk.originKind, kind), inArray(jawafChunk.originId, originIds)))
}

/** A page's or file's text -> pieces. */
export function pagePieces(markdown: string, title: string | null): IndexPiece[] {
    return chunkMarkdown(markdown, { title })
}

type FactRow = typeof jawafFactSection.$inferSelect
type QaRow = typeof jawafQa.$inferSelect
type NoteRow = typeof jawafNote.$inferSelect

function asTable(v: unknown): { columns: string[]; rows: string[][] } | null {
    if (!v || typeof v !== "object") return null
    const o = v as { columns?: unknown; rows?: unknown }
    if (!Array.isArray(o.columns) || !Array.isArray(o.rows)) return null
    return {
        columns: o.columns.map((c) => String(c ?? "")),
        rows: o.rows.filter(Array.isArray).map((r) => (r as unknown[]).map((c) => String(c ?? ""))),
    }
}

export function factBody(f: Pick<FactRow, "text" | "table">): string {
    return [f.text.trim(), tableToText(asTable(f.table))].filter(Boolean).join("\n\n")
}

export async function indexFact(f: FactRow): Promise<number> {
    const target = { workspaceId: f.workspaceId, botId: f.botId, kind: "fact" as const, originId: f.id }
    // Only approved sections answer; a draft is unindexed until Review approves it.
    if (!f.approved) return indexOrigin(target, [])
    return indexOrigin(target, chunkMarkdown(factBody(f), { title: f.title }))
}

/** Each phrasing (and the question) is embedded ALONE and points at the same answer. */
export async function indexQa(q: QaRow): Promise<number> {
    const target = { workspaceId: q.workspaceId, botId: q.botId, kind: "qa" as const, originId: q.id }
    if (!q.approved) return indexOrigin(target, [])
    const asks = [...new Set([q.question, ...q.phrasings].map((s) => s.trim()).filter(Boolean))]
    const pieces = asks.map((ask) => {
        const text = `Q: ${ask}\nA: ${q.answer}`
        return { heading: "Q&A", text, tokens: estimateTokens(text), embedText: ask }
    })
    return indexOrigin(target, pieces)
}

export async function indexNote(n: NoteRow): Promise<number> {
    const body = [n.text.trim(), tableToText(asTable(n.table))].filter(Boolean).join("\n\n")
    return indexOrigin({ workspaceId: n.workspaceId, botId: n.botId, kind: "note", originId: n.id }, chunkMarkdown(body, { title: n.title }))
}
