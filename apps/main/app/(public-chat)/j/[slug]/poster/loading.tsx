import { Skeleton } from "@repo/ui/components/ui/skeleton"

/** The poster page while it loads: the buttons row and the A5 sheet. */
export default function Loading() {
    return (
        <div className="flex min-h-dvh flex-col items-center gap-5 bg-boli-ground px-4 py-8">
            <div className="flex gap-2">
                <Skeleton className="h-10 w-36 rounded-full" />
                <Skeleton className="h-10 w-32 rounded-full" />
                <Skeleton className="h-10 w-32 rounded-full" />
            </div>
            <Skeleton className="h-3 w-72 rounded-md" />
            <div className="max-sm:[zoom:0.64]">
                <Skeleton className="h-[210mm] w-[148mm] rounded-none bg-white" />
            </div>
        </div>
    )
}
