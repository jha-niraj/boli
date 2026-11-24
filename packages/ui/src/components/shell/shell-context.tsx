"use client"

import * as React from "react"

/**
 * What a page may ask of the shell around it. Today: open the phone navigation sheet (the product rail and the open
 * product's sidebar), so a page can offer "History" on a phone without owning the sheet. Outside a shell it is a no-op.
 */
export interface ShellNavApi {
    /** Opens the phone navigation sheet (below lg). Does nothing on a wide screen. */
    openNav: () => void
}

const NOOP: ShellNavApi = { openNav: () => undefined }

export const ShellNavContext = React.createContext<ShellNavApi>(NOOP)

export function useShellNav(): ShellNavApi {
    return React.useContext(ShellNavContext)
}
