// @repo/sarvamai - Document Intelligence (doc-ai/v1): OCR of PDFs, scans and handwriting as ONE async job.
//
//   1. submit        POST /doc-ai/v1/job/digitise           (one multipart request)
//   2. poll          GET  /doc-ai/v1/job/{id}/status         -> { status, usage }
//   3. download      GET  /doc-ai/v1/job/{id}/download-url   -> { url, headers? } -> output (zip or single file)
//
// Limits: PDF / JPEG / PNG / ZIP-of-images, at most 50 MB and 10 pages per job - split upstream and run one job per
// part. A job takes tens of seconds to minutes: call `digitiseDocument` from a long job (a Workflow), never inline in a
// request the user waits on.
import { unzipSync } from 'fflate'
import { AppError } from '@repo/errors'
import { SARVAM_BASE, sarvamHttpError, sarvamKey, sleep, type SarvamAuth } from './shared'

const BASE = `${SARVAM_BASE}/doc-ai/v1`
const POLL_INTERVAL_MS = 3000
const DEFAULT_POLL_TIMEOUT_MS = 5 * 60 * 1000
const MAX_RETRIES = 6
const TERMINAL = new Set(['completed', 'partially_completed', 'failed', 'rejected'])

/** Sarvam's hard per-job ceilings. */
export const DOC_MAX_PAGES = 10
export const DOC_MAX_BYTES = 50 * 1024 * 1024

export type DocKind = 'pdf' | 'png' | 'jpg' | 'zip'
export type DocOutputFormat = 'html' | 'md'
/** Gates Sarvam's vision model: printed text, or handwriting. */
export type DocContentType = 'printed' | 'handwritten'

/** The input type from magic bytes (not the extension); null for anything Sarvam cannot take (WebP, HEIC, Office). */
export function sniffDocKind(bytes: Uint8Array): DocKind | null {
    if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return 'pdf'
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'png'
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg'
    if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) return 'zip'
    return null
}

const MIME: Record<DocKind, string> = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', zip: 'application/zip' }

export interface DigitiseInput extends SarvamAuth {
    bytes: Uint8Array
    /** BCP-47 document language, e.g. "hi-IN", "en-IN". Default "en-IN". */
    language?: string
    outputFormat?: DocOutputFormat
    contentType?: DocContentType
    /** Fix rotated scans before OCR. Default true. */
    autoOrient?: boolean
    fileName?: string
    /** Give up polling after this long. Default 5 minutes. */
    pollTimeoutMs?: number
    /** Progress lines (no document content). Default: silent. */
    log?: (message: string) => void
}

export interface DigitiseFile {
    name: string
    kind: 'html' | 'md' | 'json' | 'other'
    text: string
}

export interface DigitiseResult {
    jobId: string
    state: string
    pagesProcessed: number
    pagesTotal: number
    files: DigitiseFile[]
    /** Every html/md output joined, the usual thing to read. */
    text: string
}

function backoffMs(res: Response, attempt: number): number {
    const retryAfter = Number(res.headers.get('retry-after'))
    return Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : Math.min(60_000, 2_000 * 2 ** attempt)
}

/** GET with backoff on 429 / 5xx (Sarvam rate-limits around 10 requests a minute). Idempotent calls only. */
async function getJson<T>(path: string, apiKey: string, what: string): Promise<T> {
    for (let attempt = 0; ; attempt++) {
        const res = await fetch(`${BASE}${path}`, { headers: { 'api-subscription-key': apiKey } })
        if (res.ok) return (await res.json()) as T
        if ((res.status === 429 || res.status >= 500) && attempt < MAX_RETRIES) {
            await sleep(backoffMs(res, attempt))
            continue
        }
        throw await sarvamHttpError(res, what)
    }
}

function classify(name: string): DigitiseFile['kind'] {
    const lower = name.toLowerCase()
    if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'html'
    if (lower.endsWith('.md')) return 'md'
    if (lower.endsWith('.json')) return 'json'
    return 'other'
}

export interface DigitiseSubmitInput extends SarvamAuth {
    bytes: Uint8Array
    /** BCP-47 document language, e.g. "hi-IN", "en-IN". Default "en-IN". */
    language?: string
    outputFormat?: DocOutputFormat
    contentType?: DocContentType
    autoOrient?: boolean
    fileName?: string
}

export interface DigitiseJobStatus {
    jobId: string
    /** Sarvam's state (pending / running / completed / partially_completed / failed / rejected). */
    state: string
    /** True once the state is terminal. */
    finished: boolean
    /** True when finished with output to download. */
    succeeded: boolean
    pagesProcessed: number
    pagesTotal: number
}

/**
 * Step 1 of a resumable OCR job: validate and submit (one multipart request, retried on 429 / 5xx). Returns the Sarvam
 * job id - store it and poll with `digitiseStatus` from later slices of a long job (no waiting here).
 */
export async function submitDigitise(input: DigitiseSubmitInput): Promise<{ jobId: string; kind: DocKind }> {
    const apiKey = sarvamKey(input)
    const kind = sniffDocKind(input.bytes)
    if (!kind) throw new AppError('validation', 'Unsupported file type - upload a PDF, PNG or JPG.')
    if (input.bytes.byteLength > DOC_MAX_BYTES) throw new AppError('validation', 'The file is larger than 50 MB.')
    const outputFormat = input.outputFormat ?? 'md'
    const fileName = input.fileName ?? `document.${kind}`
    // FormData is rebuilt per attempt: a sent body is consumed and cannot be replayed.
    for (let attempt = 0; ; attempt++) {
        const form = new FormData()
        form.append('file', new Blob([input.bytes.slice().buffer as ArrayBuffer], { type: MIME[kind] }), fileName)
        form.append('language', input.language ?? 'en-IN')
        form.append('output_format', outputFormat)
        form.append('content_type', input.contentType ?? 'printed')
        form.append('auto_orient', input.autoOrient === false ? 'false' : 'true')
        const res = await fetch(`${BASE}/job/digitise`, { method: 'POST', headers: { 'api-subscription-key': apiKey }, body: form })
        if (res.ok) return { jobId: ((await res.json()) as { job_id: string }).job_id, kind }
        if ((res.status === 429 || res.status >= 500) && attempt < MAX_RETRIES) {
            await sleep(backoffMs(res, attempt))
            continue
        }
        throw await sarvamHttpError(res, 'document reading')
    }
}

/** Step 2: one status read (no waiting). */
export async function digitiseStatus(jobId: string, auth: SarvamAuth = {}): Promise<DigitiseJobStatus> {
    const apiKey = sarvamKey(auth)
    type Status = { status: string; usage?: { pages_processed?: number; pages_total?: number } }
    const status = await getJson<Status>(`/job/${jobId}/status`, apiKey, 'document reading')
    const finished = TERMINAL.has(status.status)
    return {
        jobId,
        state: status.status,
        finished,
        succeeded: status.status === 'completed' || status.status === 'partially_completed',
        pagesProcessed: status.usage?.pages_processed ?? 0,
        pagesTotal: status.usage?.pages_total ?? 0,
    }
}

/** Step 3: download and unzip a finished job's output. `text` joins every file of `outputFormat`. */
export async function digitiseOutput(jobId: string, outputFormat: DocOutputFormat = 'md', auth: SarvamAuth = {}): Promise<{ files: DigitiseFile[]; text: string }> {
    const apiKey = sarvamKey(auth)
    const link = await getJson<{ url: string; headers?: Record<string, string> }>(`/job/${jobId}/download-url`, apiKey, 'document reading')
    const dl = await fetch(link.url, { headers: link.headers ?? {} })
    if (!dl.ok) throw new AppError('network', 'The read document could not be downloaded.', { cause: new Error(`HTTP ${dl.status}`) })
    const raw = new Uint8Array(await dl.arrayBuffer())
    const files: DigitiseFile[] = []
    const decoder = new TextDecoder()
    if (sniffDocKind(raw) === 'zip') {
        for (const [name, bytes] of Object.entries(unzipSync(raw))) {
            if (!name.endsWith('/')) files.push({ name, kind: classify(name), text: decoder.decode(bytes) })
        }
    } else {
        files.push({ name: `document.${outputFormat}`, kind: outputFormat, text: decoder.decode(raw) })
    }
    files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    return { files, text: files.filter((f) => f.kind === outputFormat).map((f) => f.text).join('\n\n') }
}

/**
 * Run one OCR job end to end: submit, poll until done, download and unzip the output. Throws AppError (validation for
 * an unsupported / too large file, network / ratelimit / quota from Sarvam, network on a failed or timed-out job).
 * Blocks for up to `pollTimeoutMs`: a job runner that works in short slices uses submitDigitise / digitiseStatus /
 * digitiseOutput instead.
 */
export async function digitiseDocument(input: DigitiseInput): Promise<DigitiseResult> {
    const log = input.log ?? (() => undefined)
    const outputFormat = input.outputFormat ?? 'md'
    const { jobId } = await submitDigitise(input)
    log(`[sarvam] job ${jobId.slice(0, 8)} submitted (${Math.round(input.bytes.byteLength / 1024)} KB)`)
    const deadline = Date.now() + (input.pollTimeoutMs ?? DEFAULT_POLL_TIMEOUT_MS)
    let status: DigitiseJobStatus
    for (;;) {
        status = await digitiseStatus(jobId, input)
        if (status.finished) break
        if (Date.now() > deadline) throw new AppError('network', 'Reading the document took too long - try again.')
        await sleep(POLL_INTERVAL_MS)
    }
    log(`[sarvam] job ${jobId.slice(0, 8)} ${status.state}`)
    if (!status.succeeded) {
        throw new AppError('network', 'The document could not be read.', { cause: new Error(`Sarvam job ${jobId} ${status.state}`) })
    }
    const out = await digitiseOutput(jobId, outputFormat, input)
    return { jobId, state: status.state, pagesProcessed: status.pagesProcessed, pagesTotal: status.pagesTotal, files: out.files, text: out.text }
}

/**
 * Text of a Word (.docx) file: paragraphs from word/document.xml, one per line (no formatting, tables as tab-separated
 * cells). Not Sarvam - a plain unzip - but it lives beside the OCR reader so "read a document" is one package.
 * Throws AppError('validation') for a file that is not a .docx.
 */
export function docxToText(bytes: Uint8Array): string {
    let xml: string
    try {
        const files = unzipSync(bytes, { filter: (f) => f.name === 'word/document.xml' })
        const doc = files['word/document.xml']
        if (!doc) throw new Error('no word/document.xml')
        xml = new TextDecoder().decode(doc)
    } catch {
        throw new AppError('validation', 'That Word file could not be opened - save it as .docx or PDF and try again.')
    }
    return xml
        .replace(/<w:tab\/>/g, '\t')
        .replace(/<w:br[^>]*\/>/g, '\n')
        .replace(/<\/w:tc>/g, '\t')
        .replace(/<\/w:p>/g, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
}

/** Sarvam HTML output -> plain text (block tags become newlines). */
export function docHtmlToText(html: string): string {
    return html
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
}
