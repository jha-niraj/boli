import { Skeleton } from "@repo/ui/components/ui/skeleton"

/** /j/<slug> while the bot loads: the cover band, the logo + name, the chat box and the card, in their real places. */
export default function Loading() {
    return (
        <div className="min-h-dvh bg-boli-ground">
            <div className="h-36 w-full bg-boli-sand sm:h-48 lg:h-56" />
            <div className="mx-auto flex w-full max-w-6xl items-end gap-4 px-4 sm:px-6">
                <Skeleton className="relative z-10 -mt-9 size-[72px] rounded-2xl ring-4 ring-boli-ground" />
                <div className="flex flex-col gap-2 pb-1">
                    <Skeleton className="h-7 w-48 rounded-lg" />
                    <Skeleton className="h-4 w-64 rounded-lg" />
                </div>
            </div>
            <div className="mx-auto w-full max-w-6xl px-4 pb-4 pt-5 sm:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-6">
                <div className="flex flex-col rounded-3xl border border-neutral-200 lg:h-[min(48rem,calc(100dvh-2rem))]">
                    <div className="flex flex-col gap-1.5 border-b border-neutral-200 px-4 py-3">
                        <Skeleton className="h-5 w-44 rounded-md" />
                        <Skeleton className="h-3 w-56 rounded-md" />
                    </div>
                    <div className="flex flex-1 flex-col gap-3 px-4 py-4">
                        <div className="flex gap-2.5">
                            <Skeleton className="size-7 rounded-full" />
                            <Skeleton className="h-16 w-72 rounded-2xl" />
                        </div>
                        <div className="flex flex-wrap gap-2 pl-10">
                            <Skeleton className="h-9 w-44 rounded-full" />
                            <Skeleton className="h-9 w-36 rounded-full" />
                            <Skeleton className="h-9 w-40 rounded-full" />
                        </div>
                    </div>
                    <div className="px-3 pb-3 pt-2">
                        <Skeleton className="h-[54px] w-full rounded-[1.75rem]" />
                    </div>
                </div>
                <div className="hidden flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-5 lg:flex">
                    <Skeleton className="h-4 w-32 rounded-md" />
                    <Skeleton className="h-16 w-full rounded-lg" />
                    <Skeleton className="h-4 w-24 rounded-md" />
                    <Skeleton className="h-8 w-full rounded-full" />
                    <Skeleton className="h-8 w-full rounded-full" />
                </div>
            </div>
        </div>
    )
}
