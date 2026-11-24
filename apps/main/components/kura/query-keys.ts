import type React from 'react'

// TanStack Query keys for Kura - one key per list, so a rename or delete anywhere invalidates it.
export const KURA_HISTORY_KEY = ['kura', 'history'] as const
export const KURA_NEEDS_YOU_KEY = ['kura', 'needs-you'] as const

/** The reading measure: the transcript, the welcome, the skeleton and the composer all use it. */
export const READING_MEASURE = 'max-w-4xl'

/**
 * Kura's chat AREA and COLUMN (the page and its skeleton both use these, so they cannot drift):
 *
 *   area   - everything left of the side column; clips the header rule that runs out past the column's lines.
 *   column - THE reading column, centred at READING_MEASURE. From lg its own left and right borders ARE the two
 *            decorative lines, and the header, transcript and composer all sit INSIDE it with the same px-4. The lines
 *            and the content come from one box, so they cannot disagree whether the rail is pinned or the side panel
 *            is open. Below lg there are no lines (no room for them at 390px).
 *
 * The page takes the shell's whole box (`Page bleed`); the column is the full page height (`--app-col-h`).
 */
export const CHAT_AREA = 'flex min-h-0 min-w-0 flex-1 overflow-hidden lg:px-4'
export const CHAT_COLUMN = `relative mx-auto flex h-full min-h-0 w-full min-w-0 flex-col ${READING_MEASURE} lg:border-x lg:border-neutral-200 lg:dark:border-neutral-800`
export const CHAT_COLUMN_STYLE = { '--app-col-h': 'var(--app-page-h)' } as React.CSSProperties
/** The Page header inside the column: inset by the column's px-4, 12px above and below, no gap to the body. */
export const CHAT_PAGE_CLASS = 'gap-0 [&>:first-child]:px-4 [&>:first-child]:py-3'
/** The header's height before it is measured (12 + the 36px row + 12): the skeleton's side header uses it too. */
export const KURA_HEADER_H = 60
/** The inline gutter every block inside the column uses, so the title, the messages and the composer line up. */
export const CHAT_GUTTER = 'px-4'
