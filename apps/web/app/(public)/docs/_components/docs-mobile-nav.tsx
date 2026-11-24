"use client"

import { useState } from "react"
import { BookOpen, ChevronRight } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@repo/ui/components/ui/sheet"
import { DocsNav } from "./docs-nav"

/** Below lg the docs list moves into a left sheet, opened from a bar above the page. */
export function DocsMobileNav({ current }: { current: string }) {
    const [open, setOpen] = useState(false)
    return (
        <>
            <Button type="button" variant="outline" onClick={() => setOpen(true)} className="h-10 w-full justify-between border-boli-line bg-white px-4 text-boli-ink hover:bg-boli-sand lg:hidden">
                <span className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-boli-muted" aria-hidden />
                    Docs
                    <ChevronRight className="h-3.5 w-3.5 text-boli-muted" aria-hidden />
                    <span className="truncate font-normal text-boli-text">{current}</span>
                </span>
            </Button>
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent side="left" resizable={false} className="w-[85vw] max-w-xs bg-boli-ground">
                    <SheetHeader>
                        <SheetTitle>Docs</SheetTitle>
                        <SheetDescription>Build with the Boli API</SheetDescription>
                    </SheetHeader>
                    <nav aria-label="Docs" className="px-3">
                        <DocsNav onNavigate={() => setOpen(false)} />
                    </nav>
                </SheetContent>
            </Sheet>
        </>
    )
}
