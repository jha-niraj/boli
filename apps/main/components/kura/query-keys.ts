import type React from 'react'

// TanStack Query keys for Kura - one key per list, so a rename or delete anywhere invalidates it.
export const KURA_HISTORY_KEY = ['kura', 'history'] as const
export const KURA_NEEDS_YOU_KEY = ['kura', 'needs-you'] as const

/** The reading measure: the transcript, the welcome, the skeleton and the composer all use it. */
export const READING_MEASURE = 'max-w-4xl'

/**
 * Kura's chat column (and its skeleton): the page takes the shell's whole box (`Page bleed`), so the column pads
 * itself, and tells Page its height through `--app-col-h` (the page height minus that top padding).
 */
export const CHAT_COLUMN = 'flex min-h-0 min-w-0 flex-1 flex-col px-4 pt-3'
export const CHAT_COLUMN_STYLE = { '--app-col-h': 'calc(var(--app-page-h) - 0.75rem)' } as React.CSSProperties
